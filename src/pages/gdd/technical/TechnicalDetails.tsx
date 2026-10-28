import type { ComponentType } from "react";
import {
  ENGINES,
  type EngineId,
  type PrototypeRequirements,
} from "../prototype";
import GeneralRequirementsForm from "./GeneralRequirementsForm";
import UnityRequirementsForm from "./UnityRequirementsForm";
import ThreeJsRequirementsForm from "./ThreeJsRequirementsForm";
import UnrealRequirementsForm from "./UnrealRequirementsForm";
import PhaserRequirementsForm from "./PhaserRequirementsForm";
import RequirementsCard, { type TechnicalFormProps } from "./RequirementsCard";

const forms: Record<
  Exclude<EngineId, "custom">,
  ComponentType<TechnicalFormProps>
> = {
  unity: UnityRequirementsForm,
  threejs: ThreeJsRequirementsForm,
  unreal: UnrealRequirementsForm,
  phaser: PhaserRequirementsForm,
};

export default function TechnicalDetails({
  value,
  disabled,
  onChange,
}: {
  value: PrototypeRequirements;
  disabled: boolean;
  onChange: (value: PrototypeRequirements) => void;
}) {
  return (
    <>
      <GeneralRequirementsForm
        content={value.shared}
        disabled={disabled}
        onChange={(shared) => onChange({ ...value, shared })}
      />
      {ENGINES.filter((engine) => value.engines.includes(engine.id)).map(
        (engine) => {
          const Form = engine.id === "custom" ? undefined : forms[engine.id];
          const props: TechnicalFormProps = {
            content: value.details[engine.id] ?? "",
            disabled,
            onChange: (content) =>
              onChange({
                ...value,
                details: { ...value.details, [engine.id]: content },
              }),
          };
          return Form ? (
            <Form key={engine.id} {...props} />
          ) : (
            <RequirementsCard
              key={engine.id}
              {...props}
              title="Imported custom engine requirements"
              definitions={engine.requirements}
              options={{}}
            />
          );
        },
      )}
    </>
  );
}
