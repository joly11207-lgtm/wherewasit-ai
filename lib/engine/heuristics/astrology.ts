import { Direction, HeuristicWeights } from "@/lib/engine/types";
import { HeuristicContext } from "@/lib/engine/heuristics/types";
import {
  buildDeterministicSeed,
  parseDateSeed,
  resolveTimeBucket,
  timeBucketIndex,
  TimeBucket
} from "@/lib/engine/heuristics/utils";

type ElementKey = "fire" | "earth" | "air" | "water";

type ElementProfile = {
  directions: [Direction, Direction];
  environmentWeights: Record<string, number>;
  behaviorWeights: Record<string, number>;
  reasonTags: string[];
};

const ELEMENTS: Record<ElementKey, ElementProfile> = {
  fire: {
    directions: ["South", "East"],
    environmentWeights: { highArea: 9, electronicArea: 8, entryZone: 4 },
    behaviorWeights: { routineInterruption: 6, placedTemporarily: 5 },
    reasonTags: ["bright-area", "visible-surface", "electronics"]
  },
  earth: {
    directions: ["Southwest", "Northeast"],
    environmentWeights: { lowArea: 9, storageArea: 9, containerZone: 6, warmArea: 4 },
    behaviorWeights: { automaticRoutine: 6, contextShift: 5 },
    reasonTags: ["ground", "drawer", "fabric", "storage"]
  },
  air: {
    directions: ["East", "Southeast"],
    environmentWeights: { transitionPath: 9, containerZone: 7, entryZone: 5 },
    behaviorWeights: { attentionSplit: 6, taskSwitching: 6 },
    reasonTags: ["movement", "bag", "clothing", "route"]
  },
  water: {
    directions: ["North", "Northwest"],
    environmentWeights: { wetArea: 9, hiddenCorner: 7, lowArea: 5 },
    behaviorWeights: { stateDependentMemory: 6, visualBlindness: 5 },
    reasonTags: ["wet-area", "bathroom", "sink", "soft-cover"]
  }
};

const TIME_BIAS: Record<
  TimeBucket,
  {
    directionWeights: Partial<Record<Direction, number>>;
    environmentWeights: Record<string, number>;
    behaviorWeights: Record<string, number>;
    reasonTags: string[];
  }
> = {
  early_morning: {
    directionWeights: { East: 4 },
    environmentWeights: { entryZone: 5, highArea: 3 },
    behaviorWeights: { placedTemporarily: 4 },
    reasonTags: ["early-route", "surface"]
  },
  morning: {
    directionWeights: { East: 4, Southeast: 2 },
    environmentWeights: { transitionPath: 5, entryZone: 3 },
    behaviorWeights: { taskSwitching: 4 },
    reasonTags: ["work-route", "morning-shift"]
  },
  afternoon: {
    directionWeights: { South: 4, West: 2 },
    environmentWeights: { highArea: 4, exitPath: 3 },
    behaviorWeights: { routineInterruption: 4 },
    reasonTags: ["public-surface", "afternoon-shift"]
  },
  evening: {
    directionWeights: { West: 4, Northwest: 2 },
    environmentWeights: { containerZone: 4, transitionPath: 3 },
    behaviorWeights: { contextShift: 4 },
    reasonTags: ["return-route", "bag-zone"]
  },
  night: {
    directionWeights: { North: 4, Northeast: 2 },
    environmentWeights: { hiddenCorner: 4, lowArea: 4, warmArea: 3 },
    behaviorWeights: { automaticRoutine: 4, visualBlindness: 4 },
    reasonTags: ["bedroom-pattern", "night-search"]
  },
  late_night: {
    directionWeights: { North: 4, Northwest: 2 },
    environmentWeights: { hiddenCorner: 5, lowArea: 4 },
    behaviorWeights: { fatigue: 5, visualBlindness: 4 },
    reasonTags: ["fatigue", "late-night"]
  }
};

function chooseElement(context: HeuristicContext): ElementKey {
  const { input, sceneProfile, objectProfile } = context;
  const dateSeed = parseDateSeed(input.date);
  const bucketIndex = timeBucketIndex(resolveTimeBucket(input.time));
  const storySeed = buildDeterministicSeed(input);

  if (sceneProfile.key === "bathroom" || sceneProfile.key === "kitchen") return "water";
  if (objectProfile.key === "documents" && sceneProfile.key === "travel") return "air";
  if (objectProfile.key === "audio" || objectProfile.key === "phone") return "fire";
  if (sceneProfile.key === "bedroom" || sceneProfile.key === "home") return "earth";

  const elements: ElementKey[] = ["fire", "earth", "air", "water"];
  return elements[(dateSeed.month + dateSeed.day + bucketIndex + storySeed) % elements.length];
}

function mergeDirections(
  target: Partial<Record<Direction, number>>,
  source: Partial<Record<Direction, number>>
): void {
  Object.entries(source).forEach(([direction, value]) => {
    target[direction as Direction] = Number((((target[direction as Direction] ?? 0) + value)).toFixed(2));
  });
}

function mergeMap(target: Record<string, number>, source: Record<string, number>): void {
  Object.entries(source).forEach(([key, value]) => {
    target[key] = Number((((target[key] ?? 0) + value)).toFixed(2));
  });
}

export function astrologyHeuristic(context: HeuristicContext): HeuristicWeights {
  const { input, objectProfile, sceneProfile } = context;
  const bucket = resolveTimeBucket(input.time);
  const element = chooseElement(context);
  const elementProfile = ELEMENTS[element];
  const timeBias = TIME_BIAS[bucket];
  const directionWeights: Partial<Record<Direction, number>> = {
    [elementProfile.directions[0]]: 8,
    [elementProfile.directions[1]]: 5
  };
  const environmentWeights = { ...elementProfile.environmentWeights };
  const behaviorWeights = { ...elementProfile.behaviorWeights };

  mergeDirections(directionWeights, timeBias.directionWeights);
  mergeMap(environmentWeights, timeBias.environmentWeights);
  mergeMap(behaviorWeights, timeBias.behaviorWeights);

  if (sceneProfile.key === "travel") {
    environmentWeights.transitionPath = (environmentWeights.transitionPath ?? 0) + 4;
    environmentWeights.exitPath = (environmentWeights.exitPath ?? 0) + 3;
  }
  if (objectProfile.key === "documents") {
    environmentWeights.documentZone = (environmentWeights.documentZone ?? 0) + 5;
  }
  if (objectProfile.key === "audio" || objectProfile.key === "phone") {
    environmentWeights.electronicArea = (environmentWeights.electronicArea ?? 0) + 3;
  }

  return {
    source: "astrology",
    directionWeights,
    environmentWeights,
    behaviorWeights,
    confidence: 0.6,
    reasonTags: [...elementProfile.reasonTags, ...timeBias.reasonTags]
      .filter((tag, index, array) => array.indexOf(tag) === index)
      .slice(0, 6)
  };
}
