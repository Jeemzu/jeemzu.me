import { ENGINES } from "../prototype";
import RequirementsCard, { type TechnicalFormProps } from "./RequirementsCard";

export default function ThreeJsRequirementsForm(props: TechnicalFormProps) {
  return (
    <RequirementsCard
      {...props}
      title="Three.js requirements"
      definitions={ENGINES[1].requirements}
      options={{
        "Runtime and tooling": [
          "Node.js LTS, npm, TypeScript, Vite",
          "Node.js LTS, pnpm, TypeScript, Vite",
          "JavaScript, ES modules, Vite",
          "Undecided",
        ],
        Renderer: [
          "WebGLRenderer (WebGL 2)",
          "WebGPURenderer with WebGL 2 fallback",
          "WebGPU only",
          "Undecided",
        ],
        "Assets and loading": [
          "GLB/glTF with GLTFLoader",
          "GLB + Draco mesh compression",
          "GLB + Meshopt + KTX2 textures",
          "Undecided",
        ],
        "Gameplay dependencies": [
          "None",
          "Rapier",
          "cannon-es",
          "Web Audio API",
          "Three.js Audio",
          "HTML/CSS UI",
        ],
        "Browser constraints": [
          "Desktop browsers with WebGL 2",
          "Desktop and mobile browsers with WebGL 2",
          "User gesture required for audio",
          "Undecided",
        ],
      }}
    />
  );
}
