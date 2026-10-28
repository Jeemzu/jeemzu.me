import { SHARED_FIELDS } from "../prototype";
import RequirementsCard, { type TechnicalFormProps } from "./RequirementsCard";

export default function GeneralRequirementsForm(props: TechnicalFormProps) {
  return (
    <RequirementsCard
      {...props}
      title="General requirements"
      definitions={SHARED_FIELDS}
      options={{
        Controls: [
          "Keyboard and mouse",
          "Gamepad",
          "Keyboard, mouse, and gamepad",
          "Touch",
          "Touch and gamepad",
          "Undecided",
        ],
        Multiplayer: [
          "None",
          "Local co-op",
          "Local competitive",
          "Online co-op (client/server)",
          "Online competitive (dedicated server)",
          "Peer-to-peer",
          "Undecided",
        ],
        "Launch locales": [
          "English only",
          "English, French, German, Spanish",
          "Undecided",
        ],
        "Save data": [
          "None",
          "Local save at checkpoints",
          "Local autosave",
          "Local manual save",
          "Cloud save with local fallback",
          "Undecided",
        ],
        "Technical constraints": [
          "60 FPS target",
          "30 FPS target",
          "60 FPS desktop / 30 FPS mobile",
          "Undecided",
        ],
        "Open decisions": [
          "None",
          "Engine version",
          "Rendering pipeline",
          "Networking solution",
          "Asset delivery",
          "Undecided",
        ],
      }}
    />
  );
}
