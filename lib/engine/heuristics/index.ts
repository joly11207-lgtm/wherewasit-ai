import { HeuristicWeights } from "@/lib/engine/types";
import { astrologyHeuristic } from "@/lib/engine/heuristics/astrology";
import { behaviorHeuristic } from "@/lib/engine/heuristics/behavior";
import { liurenHeuristic } from "@/lib/engine/heuristics/liuren";
import { lostSongHeuristic } from "@/lib/engine/heuristics/lostSong";
import { memoryScienceHeuristic } from "@/lib/engine/heuristics/memoryScience";
import { normalizeHeuristicWeights } from "@/lib/engine/heuristics/normalize";
import { tarotHeuristic } from "@/lib/engine/heuristics/tarot";
import { HeuristicContext, HeuristicModule } from "@/lib/engine/heuristics/types";

const REGISTERED_HEURISTICS: HeuristicModule[] = [
  liurenHeuristic,
  lostSongHeuristic,
  tarotHeuristic,
  astrologyHeuristic,
  behaviorHeuristic,
  memoryScienceHeuristic
];

export const RAW_HEURISTIC_COUNT = REGISTERED_HEURISTICS.length;

export function runRawHeuristicWeights(context: HeuristicContext): HeuristicWeights[] {
  return REGISTERED_HEURISTICS.map((module) => module(context));
}

export function runHeuristicWeights(context: HeuristicContext): HeuristicWeights[] {
  return normalizeHeuristicWeights(runRawHeuristicWeights(context));
}

export * from "@/lib/engine/heuristics/types";
