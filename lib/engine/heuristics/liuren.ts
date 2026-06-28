import { Direction, HeuristicWeights } from "@/lib/engine/types";
import { HeuristicContext } from "@/lib/engine/heuristics/types";
import {
  buildDeterministicSeed,
  hasAnyPhrase,
  parseDateSeed,
  resolveTimeBucket,
  timeBucketIndex,
  TimeBucket
} from "@/lib/engine/heuristics/utils";

type PalaceProfile = {
  key: "great_stability" | "lingering" | "swift_joy" | "red_mouth" | "small_fortune" | "void_loss";
  directions: [Direction, Direction, Direction];
  environmentWeights: Record<string, number>;
  behaviorWeights: Record<string, number>;
  reasonTags: string[];
};

const PALACE_PROFILES: PalaceProfile[] = [
  {
    key: "great_stability",
    directions: ["East", "Southwest", "Northeast"],
    environmentWeights: {
      containerZone: 12,
      storageArea: 10,
      lowArea: 8,
      hiddenCorner: 7,
      warmArea: 6
    },
    behaviorWeights: {
      placedTemporarily: 8,
      automaticRoutine: 7,
      contextShift: 5
    },
    reasonTags: ["stable", "nearby", "container", "known-place"]
  },
  {
    key: "lingering",
    directions: ["North", "Northeast", "West"],
    environmentWeights: {
      hiddenCorner: 12,
      lowArea: 9,
      containerZone: 8,
      storageArea: 6
    },
    behaviorWeights: {
      visualBlindness: 10,
      forgotDuringTransition: 7,
      contextShift: 7
    },
    reasonTags: ["delayed", "overlooked", "under-object", "blind-spot"]
  },
  {
    key: "swift_joy",
    directions: ["South", "East", "Southeast"],
    environmentWeights: {
      highArea: 10,
      electronicArea: 8,
      entryZone: 6,
      transitionPath: 6
    },
    behaviorWeights: {
      placedTemporarily: 8,
      routineInterruption: 6,
      attentionSplit: 5
    },
    reasonTags: ["visible", "bright", "surface", "quick-recovery"]
  },
  {
    key: "red_mouth",
    directions: ["West", "Northwest", "South"],
    environmentWeights: {
      transitionPath: 12,
      exitPath: 9,
      entryZone: 7,
      containerZone: 5
    },
    behaviorWeights: {
      attentionSplit: 10,
      routineInterruption: 8,
      taskSwitching: 7
    },
    reasonTags: ["public-area", "people-contact", "interruption", "exit-route"]
  },
  {
    key: "small_fortune",
    directions: ["Southeast", "East", "North"],
    environmentWeights: {
      containerZone: 11,
      storageArea: 8,
      transitionPath: 7,
      hiddenCorner: 5
    },
    behaviorWeights: {
      placedTemporarily: 9,
      contextShift: 6,
      automaticRoutine: 6
    },
    reasonTags: ["recoverable", "familiar-route", "bag-pocket", "short-distance"]
  },
  {
    key: "void_loss",
    directions: ["Northwest", "West", "North"],
    environmentWeights: {
      hiddenCorner: 10,
      lowArea: 8,
      transitionPath: 7,
      exitPath: 6
    },
    behaviorWeights: {
      forgotDuringTransition: 8,
      stateDependentMemory: 7,
      contextShift: 7
    },
    reasonTags: ["uncertain", "displaced", "covered", "wider-area"]
  }
];

const TIME_OFFSETS: Record<TimeBucket, number> = {
  early_morning: 0,
  morning: 1,
  afternoon: 2,
  evening: 3,
  night: 4,
  late_night: 5
};

function addIf(condition: boolean, weights: Record<string, number>, key: string, amount: number): void {
  if (!condition) return;
  weights[key] = (weights[key] ?? 0) + amount;
}

function addDirection(
  weights: Partial<Record<Direction, number>>,
  direction: Direction,
  amount: number
): void {
  weights[direction] = (weights[direction] ?? 0) + amount;
}

export function liurenHeuristic(context: HeuristicContext): HeuristicWeights {
  const { input, objectProfile, sceneProfile, timeline } = context;
  const story = input.story.toLowerCase();
  const dateSeed = parseDateSeed(input.date);
  const bucket = resolveTimeBucket(input.time);
  const seed = buildDeterministicSeed(input);
  const baseIndex = (dateSeed.total + TIME_OFFSETS[bucket] + seed) % PALACE_PROFILES.length;
  const palace = PALACE_PROFILES[baseIndex];
  const directionWeights: Partial<Record<Direction, number>> = {
    [palace.directions[0]]: 12,
    [palace.directions[1]]: 8,
    [palace.directions[2]]: 5
  };
  const environmentWeights = { ...palace.environmentWeights };
  const behaviorWeights = { ...palace.behaviorWeights };
  const reasonTags = [...palace.reasonTags];

  const isSmallItem = /airpods|earbuds|ring|jewelry|keys|glasses|camera/i.test(input.item);
  const isDocumentItem = objectProfile.key === "documents";
  const isPublicOrTravel = hasAnyPhrase(story, [
    "airport",
    "travel",
    "gate",
    "restaurant",
    "cafe",
    "hotel lobby",
    "checkout",
    "boarding"
  ]);
  const isWaterScene = (sceneProfile.profile.wetAreas?.length ?? 0) > 0 || hasAnyPhrase(story, ["sink", "shower", "water", "bathroom"]);

  addIf(isSmallItem, environmentWeights, "hiddenCorner", 2);
  addIf(isSmallItem, environmentWeights, "lowArea", 2);
  addIf(isDocumentItem, environmentWeights, "documentZone", 8);
  addIf(isDocumentItem, environmentWeights, "containerZone", 2);
  addIf(isPublicOrTravel, environmentWeights, "transitionPath", 3);
  addIf(isPublicOrTravel, environmentWeights, "exitPath", 2);
  addIf(isPublicOrTravel, behaviorWeights, "attentionSplit", 2);
  addIf(isPublicOrTravel, behaviorWeights, "routineInterruption", 2);
  addIf(isWaterScene, environmentWeights, "wetArea", 6);
  addIf(isWaterScene, behaviorWeights, "placedTemporarily", 2);

  if (timeline.transitionPoints.length >= 2) {
    behaviorWeights.forgotDuringTransition = (behaviorWeights.forgotDuringTransition ?? 0) + 2;
    environmentWeights.transitionPath = (environmentWeights.transitionPath ?? 0) + 2;
  }

  if (sceneProfile.key === "home" || sceneProfile.key === "bedroom" || sceneProfile.key === "living_room") {
    addDirection(directionWeights, "East", 2);
    environmentWeights.warmArea = (environmentWeights.warmArea ?? 0) + 2;
  }

  if (sceneProfile.key === "car" || sceneProfile.key === "travel") {
    addDirection(directionWeights, "West", 2);
    environmentWeights.exitPath = (environmentWeights.exitPath ?? 0) + 2;
  }

  return {
    source: "liuren",
    directionWeights,
    environmentWeights,
    behaviorWeights,
    confidence: input.date && input.time ? 0.76 : 0.64,
    reasonTags: reasonTags.filter((tag, index, array) => array.indexOf(tag) === index).slice(0, 6)
  };
}
