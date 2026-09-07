import iceAge from "./ice_age.json";
import norse from "./norse.json";
import mastCell from "./mast_cell.json";
import twoKeys from "./two_keys.json";
import { LevelDef } from "../types";

const ALL: LevelDef[] = [iceAge as LevelDef, norse as LevelDef, mastCell as LevelDef, twoKeys as LevelDef];

export const LEVELS: ReadonlyArray<LevelDef> = ALL.slice().sort((a, b) => a.order - b.order);

export function getLevel(id: string): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}
