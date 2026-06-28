import { HeuristicWeights, KnowledgeResult } from "@/lib/engine/types";
import { astrologyHeuristic } from "@/lib/engine/heuristics/astrology";
import { liurenHeuristic } from "@/lib/engine/heuristics/liuren";
import { lostSongHeuristic } from "@/lib/engine/heuristics/lostSong";
import { normalizeHeuristicWeights } from "@/lib/engine/heuristics/normalize";
import { tarotHeuristic } from "@/lib/engine/heuristics/tarot";
import { HeuristicContext, HeuristicModule } from "@/lib/engine/heuristics/types";
import { mergeReadingLists } from "@/lib/engine/heuristics/utils";

const REGISTERED_HEURISTICS: HeuristicModule[] = [
  liurenHeuristic,
  lostSongHeuristic,
  tarotHeuristic,
  astrologyHeuristic
];

export const RAW_HEURISTIC_COUNT = REGISTERED_HEURISTICS.length;

export function runRawHeuristicWeights(context: HeuristicContext): HeuristicWeights[] {
  return REGISTERED_HEURISTICS.map((module) => module(context));
}

export function runHeuristicWeights(context: HeuristicContext): HeuristicWeights[] {
  return normalizeHeuristicWeights(runRawHeuristicWeights(context));
}

export function buildKnowledgeResult(heuristicWeights: HeuristicWeights[]): KnowledgeResult {
  const readings = heuristicWeights
    .map((heuristic) => heuristic.reading)
    .filter((reading): reading is NonNullable<typeof reading> => Boolean(reading));

  const merged = mergeReadingLists(readings);

  return {
    readings,
    ...merged
  };
}

export * from "@/lib/engine/heuristics/types";
