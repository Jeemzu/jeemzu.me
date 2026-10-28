import { GiFrog } from "react-icons/gi";
import type { IconId } from "../profile";
import { ICON_COMPONENTS } from "./iconMap";

export function PlayerIcon({ icon, color, size = 28 }: { icon: string; color: string; size?: number }) {
  const Icon = ICON_COMPONENTS[icon as IconId] ?? GiFrog;
  return (
    <span className="bpp-avatar" style={{ background: color, width: size, height: size }}>
      <Icon size={size * 0.68} />
    </span>
  );
}