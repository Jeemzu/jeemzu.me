import { ENGINES } from "../prototype";
import RequirementsCard, { type TechnicalFormProps } from "./RequirementsCard";

export default function UnrealRequirementsForm(props: TechnicalFormProps) {
  return (
    <RequirementsCard
      {...props}
      title="Unreal requirements"
      definitions={ENGINES[2].requirements}
      options={{
        "Unreal version": ["5.6", "5.5", "5.4", "5.3", "4.27", "Undecided"],
        Rendering: [
          "Deferred rendering",
          "Forward rendering",
          "Lumen + Nanite",
          "Mobile rendering",
          "Undecided",
        ],
        "Gameplay implementation": [
          "Blueprint",
          "C++",
          "C++ systems with Blueprint gameplay",
          "Gameplay Ability System",
          "Undecided",
        ],
        "Assets and packaging": [
          "Asset Manager + soft references",
          "Pak files",
          "Io Store",
          "World Partition",
          "Undecided",
        ],
      }}
    />
  );
}
