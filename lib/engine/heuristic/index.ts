import { EngineInput, HeuristicSignal } from "@/lib/engine/types";

import { liurenHeuristic } from "@/lib/engine/heuristic/liuren";
import { lostSongHeuristic } from "@/lib/engine/heuristic/lostSong";
import { symbolicHeuristic } from "@/lib/engine/heuristic/symbolic";

export function runHeuristicSignals(input: EngineInput): HeuristicSignal[] {
  return [liurenHeuristic(input), lostSongHeuristic(input), symbolicHeuristic(input)];
}
