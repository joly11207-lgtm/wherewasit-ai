import { Direction, HeuristicWeights } from "@/lib/engine/types";

const DIRECTION_ITEM_CAP = 12;
const DIRECTION_TOTAL_CAP = 28;
const ENVIRONMENT_ITEM_CAP = 10;
const ENVIRONMENT_TOTAL_CAP = 30;
const BEHAVIOR_ITEM_CAP = 10;
const BEHAVIOR_TOTAL_CAP = 30;
const MIN_CONFIDENCE = 0.45;
const MAX_CONFIDENCE = 0.85;

function round(value: number): number {
  return Number(value.toFixed(2));
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function normalizeMap<T extends string>(
  weights: Partial<Record<T, number>> | Record<string, number>,
  itemCap: number,
  totalCap: number
): Record<string, number> {
  const clampedEntries = Object.entries(weights)
    .filter(([, value]) => typeof value === "number" && value > 0)
    .map(([key, value]) => [key, clamp(value as number, 0, itemCap)] as const);

  const total = clampedEntries.reduce((sum, [, value]) => sum + value, 0);
  const scale = total > totalCap ? totalCap / total : 1;

  return Object.fromEntries(
    clampedEntries.map(([key, value]) => [key, round(value * scale)])
  );
}

function normalizeDirectionWeights(
  weights: Partial<Record<Direction, number>>
): Partial<Record<Direction, number>> {
  return normalizeMap<Direction>(weights, DIRECTION_ITEM_CAP, DIRECTION_TOTAL_CAP) as Partial<
    Record<Direction, number>
  >;
}

export function normalizeHeuristicWeights(rawWeights: HeuristicWeights[]): HeuristicWeights[] {
  return rawWeights.map((heuristic) => ({
    source: heuristic.source,
    directionWeights: normalizeDirectionWeights(heuristic.directionWeights),
    environmentWeights: normalizeMap(heuristic.environmentWeights, ENVIRONMENT_ITEM_CAP, ENVIRONMENT_TOTAL_CAP),
    behaviorWeights: normalizeMap(heuristic.behaviorWeights, BEHAVIOR_ITEM_CAP, BEHAVIOR_TOTAL_CAP),
    confidence: round(clamp(heuristic.confidence, MIN_CONFIDENCE, MAX_CONFIDENCE)),
    reasonTags: heuristic.reasonTags.filter((tag, index) => heuristic.reasonTags.indexOf(tag) === index).slice(0, 6)
  }));
}
