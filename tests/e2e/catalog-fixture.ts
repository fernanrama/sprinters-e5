import { readFileSync } from "node:fs";
import type { Exercise } from "../../shared/exercises";

export const catalogFixture: Exercise[] = JSON.parse(readFileSync("api/data/exercises.json", "utf8"));
export const catalogSize = catalogFixture.length;
