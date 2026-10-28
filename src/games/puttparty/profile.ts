export const ICONS = ["frog", "fox", "owl", "cat", "bear", "rabbit", "penguin", "turtle", "dog", "unicorn", "octopus", "dino"] as const;
export type IconId = (typeof ICONS)[number];

export interface Profile {
  name: string;
  icon: IconId;
}

const KEY = "bpp.profile";
export const NAME_MAX = 16;

/** Strips control characters and trims like the server's `PuttSession.CleanName`; the input caps length. */
export function cleanName(name: string): string {
  // eslint-disable-next-line no-control-regex
  return name.replace(/[\u0000-\u001f\u007f-\u009f]/g, "").trim().slice(0, NAME_MAX).trim();
}

const isIcon = (v: unknown): v is IconId => typeof v === "string" && (ICONS as readonly string[]).includes(v);

export function loadProfile(storage: Pick<Storage, "getItem"> = localStorage): Profile {
  try {
    const raw = JSON.parse(storage.getItem(KEY) ?? "null") as Partial<Profile> | null;
    return {
      name: typeof raw?.name === "string" ? cleanName(raw.name) : "",
      icon: isIcon(raw?.icon) ? raw.icon : ICONS[0],
    };
  } catch {
    return { name: "", icon: ICONS[0] };
  }
}

export function saveProfile(profile: Profile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // Profile still works for this page if storage is unavailable.
  }
}
