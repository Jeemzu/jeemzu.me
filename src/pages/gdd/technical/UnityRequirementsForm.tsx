import { ENGINES } from "../prototype";
import RequirementsCard, { type TechnicalFormProps } from "./RequirementsCard";

export default function UnityRequirementsForm(props: TechnicalFormProps) {
  return (
    <RequirementsCard
      {...props}
      title="Unity requirements"
      definitions={ENGINES[0].requirements}
      options={{
        "Unity version": [
          "6000.3.0f1",
          "6000.0.60f1",
          "2022.3.62f1",
          "2021.3.45f1",
          "Undecided",
        ],
        "Render pipeline": ["URP", "HDRP", "Built-in", "Undecided"],
        "Asset loading": [
          "Addressables",
          "Direct references",
          "Resources",
          "AssetBundles",
          "Undecided",
        ],
        "Required packages and modules": [
          "None",
          "Input System",
          "Cinemachine",
          "Netcode for GameObjects",
          "Unity Transport",
          "Android Build Support",
          "iOS Build Support",
          "Web Build Support",
        ],
      }}
    />
  );
}
