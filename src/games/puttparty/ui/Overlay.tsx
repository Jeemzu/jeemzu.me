import { useEffect, useState } from "react";
import { useStore } from "zustand";
import { MdClose, MdContentCopy, MdLogout, MdStar } from "react-icons/md";
import type { PlayerState, StateMessage } from "../net/protocol";
import { ICONS, NAME_MAX, cleanName, saveProfile, type Profile } from "../profile";
import { playerColor } from "../render/materials";
import type { PuttIntents, PuttStore } from "../store";
import { errorText, t } from "../strings";
import { ICON_COMPONENTS } from "./iconMap";
import { PlayerIcon } from "./icons";

interface Props {
  store: PuttStore;
  intents: PuttIntents;
}

export function Overlay({ store, intents }: Props) {
  const state = useStore(store, (s) => s.state);
  const connection = useStore(store, (s) => s.connection);
  const playerId = useStore(store, (s) => s.playerId);
  const attached = state !== null && playerId !== null;

  return (
    <div className="bpp-root">
      {!attached && <Lobby store={store} intents={intents} />}
      {attached && state.phase === "lobby" && <Room store={store} intents={intents} state={state} selfId={playerId} />}
      {attached && (state.phase === "playing" || state.phase === "transition") && <Hud store={store} intents={intents} state={state} selfId={playerId} />}
      {attached && state.phase === "finished" && <Results intents={intents} state={state} selfId={playerId} />}
      {connection !== "open" && <div className="bpp-toast bpp-toast--net">{t(connection === "connecting" ? "net.connecting" : "net.reconnecting")}</div>}
      <Ping store={store} />
      <ErrorToast store={store} intents={intents} />
    </div>
  );
}

function Ping({ store }: { store: PuttStore }) {
  const latency = useStore(store, (s) => s.latency);
  const shotMs = useStore(store, (s) => s.shotMs);
  if (!latency) return null;
  const ms = (n: number) => Math.round(n);
  const detail = [t("net.pingDetail", { rtt: ms(latency.rtt), min: ms(latency.min), avg: ms(latency.avg), jitter: ms(latency.jitter) })];
  if (shotMs !== null) detail.push(t("net.shotDetail", { ms: ms(shotMs) }));
  const quality = latency.rtt < 80 ? "good" : latency.rtt < 160 ? "ok" : "bad";
  return (
    <div className="bpp-ping" data-quality={quality} title={detail.join("\n")}>
      {t("net.ping", { ms: ms(latency.rtt) })}
    </div>
  );
}

function ErrorToast({ store, intents }: Props) {
  const error = useStore(store, (s) => s.error);
  useEffect(() => {
    if (!error) return;
    const id = window.setTimeout(() => intents.clearError(), 3500);
    return () => clearTimeout(id);
  }, [error, intents]);
  if (!error) return null;
  return (
    <div className="bpp-toast bpp-toast--error" role="alert">
      {errorText(error.code)}
    </div>
  );
}

function Lobby({ store, intents }: Props) {
  const saved = useStore(store, (s) => s.profile);
  const online = useStore(store, (s) => s.connection === "open");
  const [name, setName] = useState(saved.name);
  const [icon, setIcon] = useState(saved.icon);
  const [code, setCode] = useState("");
  const profile = (): Profile | null => {
    const clean = cleanName(name);
    if (!clean) return null;
    const p = { name: clean, icon };
    saveProfile(p);
    store.setState({ profile: p });
    return p;
  };
  const valid = cleanName(name).length > 0;
  const codeValid = /^[A-Z0-9]{6}$/.test(code);

  return (
    <div className="bpp-center">
      <div className="bpp-panel bpp-lobby">
        <h1 className="bpp-title">Better Putt Party</h1>
        <label className="bpp-field">
          <span>{t("lobby.name")}</span>
          <input value={name} maxLength={NAME_MAX} autoFocus onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="bpp-field">
          <span>{t("lobby.icon")}</span>
          <div className="bpp-icons" role="radiogroup" aria-label={t("lobby.icon")}>
            {ICONS.map((id) => {
              const Icon = ICON_COMPONENTS[id];
              return (
                <button key={id} type="button" role="radio" aria-checked={icon === id} aria-label={id} title={id}
                  className="bpp-icon-btn" data-active={icon === id} onClick={() => setIcon(id)}>
                  <Icon size={26} />
                </button>
              );
            })}
          </div>
        </div>
        <button className="bpp-btn bpp-btn--primary" disabled={!valid || !online} onClick={() => { const p = profile(); if (p) intents.create(p); }}>
          {t("lobby.create")}
        </button>
        <form className="bpp-join" onSubmit={(e) => { e.preventDefault(); const p = profile(); if (p && codeValid) intents.join(code, p); }}>
          <input aria-label={t("lobby.code")} placeholder={t("lobby.code")} value={code} maxLength={6}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} />
          <button className="bpp-btn" type="submit" disabled={!valid || !codeValid || !online}>{t("lobby.join")}</button>
        </form>
      </div>
    </div>
  );
}

function Room({ store, intents, state, selfId }: Props & { state: StateMessage; selfId: string }) {
  const courses = useStore(store, (s) => s.courses);
  const isHost = state.hostId === selfId;
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(state.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard can be blocked; the code is still visible.
    }
  };

  return (
    <div className="bpp-center">
      <div className="bpp-panel bpp-room">
        <div className="bpp-room-head">
          <h2 className="bpp-title bpp-title--sm">{t("room.title", { code: state.code })}</h2>
          <button className="bpp-icon-only" title={t("room.copy")} aria-label={t("room.copy")} data-done={copied} onClick={copy}>
            <MdContentCopy />
          </button>
          <span className="bpp-muted">{t("room.players", { count: state.players.length })}</span>
        </div>
        <ul className="bpp-players">
          {state.players.map((p) => (
            <li key={p.id} data-self={p.id === selfId} data-offline={!p.connected}>
              <PlayerIcon icon={p.icon} color={playerColor(p.color)} />
              <span className="bpp-name">{p.name}</span>
              {p.id === state.hostId && <MdStar className="bpp-host" title={t("room.host")} aria-label={t("room.host")} />}
            </li>
          ))}
        </ul>
        <label className="bpp-field">
          <span>{t("room.course")}</span>
          <select value={state.courseId ?? ""} disabled={!isHost} onChange={(e) => intents.selectCourse(e.target.value)}>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <div className="bpp-row">
          <button className="bpp-btn" onClick={intents.leave}>{t("room.leave")}</button>
          {isHost
            ? <button className="bpp-btn bpp-btn--primary" onClick={intents.start}>{t("room.start")}</button>
            : <span className="bpp-muted">{t("room.waiting")}</span>}
        </div>
      </div>
    </div>
  );
}

function statusText(p: PlayerState, limit: number): string {
  if (p.disqualified) return t("hud.out");
  if (!p.connected) return t("hud.offline");
  if (p.sunk) return t("hud.sunk");
  if (p.holeDone && p.strokes >= limit) return t("hud.limit");
  return String(p.strokes);
}

function Hud({ store, intents, state, selfId }: Props & { state: StateMessage; selfId: string }) {
  const course = useStore(store, (s) => s.course);
  const hole = course?.holes[state.holeIndex];
  const self = state.players.find((p) => p.id === selfId);
  if (!hole || !self) return null;
  const last = state.holeIndex === (course?.holes.length ?? 6) - 1;
  const ranked = [...state.players].sort((a, b) => a.total - b.total || a.color - b.color);

  return (
    <>
      <div className="bpp-hud-top">
        <div className="bpp-chip bpp-chip--hole">
          <strong>{t("hud.hole", { n: state.holeIndex + 1 })}</strong>
          <span>{t("hud.par", { n: hole.par })}</span>
        </div>
        <div className="bpp-chip">{t("hud.strokes", { n: self.strokes, limit: hole.strokeLimit })}</div>
        <button className="bpp-icon-only bpp-leave" title={t("room.leave")} aria-label={t("room.leave")} onClick={intents.leave}>
          <MdLogout />
        </button>
      </div>
      <ol className="bpp-board">
        {ranked.map((p) => (
          <li key={p.id} data-self={p.id === selfId} data-done={p.holeDone} data-offline={!p.connected || p.disqualified}>
            <PlayerIcon icon={p.icon} color={playerColor(p.color)} size={24} />
            <span className="bpp-name">{p.name}</span>
            <span className="bpp-now">{statusText(p, hole.strokeLimit)}</span>
            <span className="bpp-total" title={t("hud.total")}>{p.total}</span>
          </li>
        ))}
      </ol>
      {state.phase === "transition" && <div className="bpp-banner">{t(last ? "hud.final" : "hud.next")}</div>}
      {state.phase === "playing" && self.holeDone && <div className="bpp-banner bpp-banner--soft">{t("hud.waiting")}</div>}
    </>
  );
}

function Results({ intents, state, selfId }: { intents: PuttIntents; state: StateMessage; selfId: string }) {
  const winners = state.players.filter((p) => state.winners.includes(p.id));
  const ranked = [...state.players].sort((a, b) => Number(a.disqualified) - Number(b.disqualified) || a.total - b.total);
  const isHost = state.hostId === selfId;
  const crown = `${import.meta.env.BASE_URL}puttparty/crown.svg`;

  return (
    <div className="bpp-center bpp-center--dim">
      <div className="bpp-panel bpp-results">
        <div className="bpp-winners">
          {winners.map((w) => (
            <div key={w.id} className="bpp-winner">
              <img className="bpp-crown" src={crown} alt="" />
              <PlayerIcon icon={w.icon} color={playerColor(w.color)} size={84} />
              <span className="bpp-name">{w.name}</span>
            </div>
          ))}
        </div>
        <h2 className="bpp-title">{t(winners.length > 1 ? "results.winners" : "results.winner")}</h2>
        <table className="bpp-card">
          <thead>
            <tr>
              <th />
              {[1, 2, 3, 4, 5, 6].map((n) => <th key={n}>{n}</th>)}
              <th>{t("hud.total")}</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((p) => (
              <tr key={p.id} data-self={p.id === selfId} data-out={p.disqualified}>
                <td className="bpp-card-name">
                  <PlayerIcon icon={p.icon} color={playerColor(p.color)} size={22} />
                  <span>{p.name}</span>
                </td>
                {[0, 1, 2, 3, 4, 5].map((i) => <td key={i}>{p.scores[i] ?? "–"}</td>)}
                <td className="bpp-card-total">{p.disqualified ? t("hud.out") : p.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="bpp-row">
          <button className="bpp-btn" onClick={intents.leave}>
            <MdClose /> {t("room.leave")}
          </button>
          {isHost && <button className="bpp-btn bpp-btn--primary" onClick={intents.returnToLobby}>{t("results.lobby")}</button>}
        </div>
      </div>
    </div>
  );
}
