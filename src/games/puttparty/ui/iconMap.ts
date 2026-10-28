import type { IconType } from "react-icons";
import { GiBearFace, GiCat, GiDinosaurRex, GiFox, GiFrog, GiOctopus, GiOwl, GiPenguin, GiRabbit, GiSittingDog, GiTurtle, GiUnicorn } from "react-icons/gi";
import type { IconId } from "../profile";

export const ICON_COMPONENTS: Record<IconId, IconType> = {
  frog: GiFrog,
  fox: GiFox,
  owl: GiOwl,
  cat: GiCat,
  bear: GiBearFace,
  rabbit: GiRabbit,
  penguin: GiPenguin,
  turtle: GiTurtle,
  dog: GiSittingDog,
  unicorn: GiUnicorn,
  octopus: GiOctopus,
  dino: GiDinosaurRex,
};
