import { ENGINES } from "../prototype";
import RequirementsCard, { type TechnicalFormProps } from "./RequirementsCard";

export default function PhaserRequirementsForm(props: TechnicalFormProps) {
  return (
    <RequirementsCard
      {...props}
      title="Phaser requirements"
      definitions={ENGINES[3].requirements}
      options={{
        "Runtime and tooling": [
          "Phaser 3, Node.js LTS, npm, TypeScript, Vite",
          "Phaser 3, JavaScript, Vite",
          "Undecided",
        ],
        Renderer: [
          "AUTO (WebGL with Canvas fallback)",
          "WebGL",
          "Canvas",
          "Undecided",
        ],
        "Gameplay dependencies": [
          "Arcade Physics",
          "Matter.js",
          "No physics",
          "Phaser Input + Sound",
          "Undecided",
        ],
        "Assets and delivery": [
          "Texture atlases + Phaser Loader",
          "Spritesheets + Phaser Loader",
          "Static hosting with relative base paths",
          "Undecided",
        ],
      }}
    />
  );
}
