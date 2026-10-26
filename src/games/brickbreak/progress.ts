import { toast } from "sonner";
import { TOTAL_LEVELS } from "./levels";

const UNLOCK_KEY = "brickbreak_highest_completed";
export function highestCompleted(): number {
  try {
    const raw = localStorage.getItem(UNLOCK_KEY);
    if (raw === null) return 0;
    const level = Number(raw);
    if (Number.isInteger(level) && level >= 0 && level <= TOTAL_LEVELS) return level;
    console.warn("[brickbreak] invalid saved level progress", raw);
  } catch (error) { console.warn("[brickbreak] could not read level progress", error); }
  return 0;
}
export function saveProgress(level: number, score: number): void {
  try {
    if (level > highestCompleted()) localStorage.setItem(UNLOCK_KEY, String(level));
    const best = Number(localStorage.getItem("highScore_Brick Break")) || 0;
    if (score > best) localStorage.setItem("highScore_Brick Break", String(score));
  } catch (error) {
    console.error("[brickbreak] could not save progress", error);
    toast.error("Could not save Brick Break progress.");
  }
}
