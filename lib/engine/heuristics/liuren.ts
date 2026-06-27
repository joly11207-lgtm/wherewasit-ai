import { Direction, HeuristicWeights } from "@/lib/engine/types";
import { HeuristicContext } from "@/lib/engine/heuristics/types";

const DIRECTIONS: Direction[] = [
  "North",
  "Northeast",
  "East",
  "Southeast",
  "South",
  "Southwest",
  "West",
  "Northwest"
];

function hashValue(seed: string): number {
  return seed.split("").reduce((total, char, index) => total + char.charCodeAt(0) * (index + 3), 0);
}

export function liurenHeuristic(context: HeuristicContext): HeuristicWeights {
  const { input, objectProfile, sceneProfile, timeline } = context;
  const seed = hashValue(`${input.date ?? "na"}|${input.time}|${input.item}|${input.place}`);
  const primary = DIRECTIONS[seed % DIRECTIONS.length];
  const secondary = DIRECTIONS[(seed + 3) % DIRECTIONS.length];
  const tertiary = DIRECTIONS[(seed + 5) % DIRECTIONS.length];
  const isSmallItem = /airpods|earbuds|ring|jewelry|keys|glasses/i.test(input.item);
  const isDocumentItem = objectProfile.key === "documents";

  return {
    source: "liuren",
    directionWeights: {
      [primary]: 18,
      [secondary]: 10,
      [tertiary]: 6
    },
    environmentWeights: {
      lowArea: isSmallItem ? 12 : 6,
      containerZone: sceneProfile.profile.commonContainers.length > 0 ? 10 : 4,
      transitionPath: timeline.transitionPoints.length > 1 ? 10 : 5,
      wetArea: sceneProfile.profile.wetAreas?.length ? 8 : 0,
      documentZone: isDocumentItem ? 8 : 0
    },
    behaviorWeights: {
      forgotDuringTransition: Math.min(18, 6 + timeline.transitionPoints.length * 4),
      placedTemporarily: 10,
      attentionSplit: timeline.attentionShiftMoments.length > 1 ? 8 : 4
    },
    confidence: input.date && input.time ? 0.74 : 0.62,
    reasonTags: [
      ...(sceneProfile.profile.wetAreas?.length ? ["water"] : []),
      ...(isSmallItem ? ["small-object"] : []),
      ...(isDocumentItem ? ["document"] : []),
      ...(timeline.transitionPoints.length > 0 ? ["transition"] : []),
      "container"
    ].slice(0, 5)
  };
}
