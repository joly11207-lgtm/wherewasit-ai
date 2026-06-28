import { Direction, HeuristicWeights } from "@/lib/engine/types";
import { HeuristicContext } from "@/lib/engine/heuristics/types";
import { buildDeterministicSeed, hasAnyPhrase } from "@/lib/engine/heuristics/utils";

type TrigramKey = "zhen" | "li" | "kun" | "qian" | "kan" | "xun" | "dui" | "gen";

type TrigramProfile = {
  direction: Direction;
  environmentWeights: Record<string, number>;
  behaviorWeights: Record<string, number>;
  reasonTags: string[];
};

const TRIGRAMS: Record<TrigramKey, TrigramProfile> = {
  zhen: {
    direction: "East",
    environmentWeights: { transitionPath: 9, entryZone: 7, highArea: 4 },
    behaviorWeights: { taskSwitching: 7, attentionSplit: 5 },
    reasonTags: ["wood", "movement", "doorway", "path"]
  },
  li: {
    direction: "South",
    environmentWeights: { highArea: 10, electronicArea: 9, entryZone: 4 },
    behaviorWeights: { placedTemporarily: 7, routineInterruption: 5 },
    reasonTags: ["bright-area", "electronics", "visible-surface"]
  },
  kun: {
    direction: "Southwest",
    environmentWeights: { lowArea: 10, storageArea: 9, containerZone: 8, warmArea: 5 },
    behaviorWeights: { automaticRoutine: 6, contextShift: 5 },
    reasonTags: ["ground", "fabric", "drawer", "storage"]
  },
  qian: {
    direction: "Northwest",
    environmentWeights: { highArea: 8, containerZone: 8, storageArea: 7, exitPath: 5 },
    behaviorWeights: { routineInterruption: 6, taskSwitching: 5 },
    reasonTags: ["metal", "vehicle", "box", "container"]
  },
  kan: {
    direction: "North",
    environmentWeights: { wetArea: 10, hiddenCorner: 7, lowArea: 6 },
    behaviorWeights: { stateDependentMemory: 6, placedTemporarily: 5 },
    reasonTags: ["water", "bathroom", "sink", "drain"]
  },
  xun: {
    direction: "Southeast",
    environmentWeights: { containerZone: 9, hiddenCorner: 7, transitionPath: 6, warmArea: 4 },
    behaviorWeights: { contextShift: 6, attentionSplit: 5 },
    reasonTags: ["fabric", "bag", "clothing", "corner"]
  },
  dui: {
    direction: "West",
    environmentWeights: { containerZone: 8, electronicArea: 6, highArea: 5, storageArea: 5 },
    behaviorWeights: { placedTemporarily: 6, visualBlindness: 5 },
    reasonTags: ["metal", "opening", "small-container", "jewelry"]
  },
  gen: {
    direction: "Northeast",
    environmentWeights: { hiddenCorner: 10, storageArea: 7, lowArea: 6 },
    behaviorWeights: { visualBlindness: 7, automaticRoutine: 5 },
    reasonTags: ["stillness", "corner", "shelf", "blocked-place"]
  }
};

function choosePrimaryTrigram(context: HeuristicContext): TrigramKey {
  const { input, objectProfile, sceneProfile } = context;
  const story = input.story.toLowerCase();

  if (objectProfile.key === "documents") return sceneProfile.key === "travel" ? "qian" : "gen";
  if (objectProfile.key === "jewelry") return hasAnyPhrase(story, ["sink", "water", "bathroom", "kitchen"]) ? "kan" : "dui";
  if (objectProfile.key === "audio" || objectProfile.key === "phone") return hasAnyPhrase(story, ["charging", "electronics", "device"]) ? "li" : "xun";
  if (objectProfile.key === "wallet") return sceneProfile.key === "cafe" || sceneProfile.key === "restaurant" ? "dui" : "kun";
  if (objectProfile.key === "keys") return sceneProfile.key === "car" ? "qian" : "zhen";
  if (objectProfile.key === "glasses") return sceneProfile.key === "living_room" || sceneProfile.key === "bedroom" ? "gen" : "li";
  if (objectProfile.key === "bag" || objectProfile.key === "camera") return "xun";

  return "zhen";
}

function chooseSecondaryTrigram(context: HeuristicContext, primary: TrigramKey): TrigramKey {
  const { sceneProfile, input } = context;
  const story = input.story.toLowerCase();
  const seed = buildDeterministicSeed(input);

  if (sceneProfile.key === "bathroom" || sceneProfile.key === "kitchen") return "kan";
  if (sceneProfile.key === "travel") return "qian";
  if (sceneProfile.key === "car") return "qian";
  if (sceneProfile.key === "cafe" || sceneProfile.key === "restaurant") return "dui";
  if (sceneProfile.key === "bedroom" || sceneProfile.key === "living_room") return "gen";
  if (hasAnyPhrase(story, ["drawer", "shelf", "corner", "under furniture"])) return "gen";

  const options = (Object.keys(TRIGRAMS) as TrigramKey[]).filter((key) => key !== primary);
  return options[seed % options.length];
}

function addDirection(
  weights: Partial<Record<Direction, number>>,
  direction: Direction,
  amount: number
): void {
  weights[direction] = (weights[direction] ?? 0) + amount;
}

function mergeWeights(target: Record<string, number>, source: Record<string, number>, scale: number): void {
  Object.entries(source).forEach(([key, value]) => {
    target[key] = (target[key] ?? 0) + Number((value * scale).toFixed(2));
  });
}

export function lostSongHeuristic(context: HeuristicContext): HeuristicWeights {
  const primary = choosePrimaryTrigram(context);
  const secondary = chooseSecondaryTrigram(context, primary);
  const primaryProfile = TRIGRAMS[primary];
  const secondaryProfile = TRIGRAMS[secondary];
  const directionWeights: Partial<Record<Direction, number>> = {};
  const environmentWeights: Record<string, number> = {};
  const behaviorWeights: Record<string, number> = {};

  addDirection(directionWeights, primaryProfile.direction, 12);
  addDirection(directionWeights, secondaryProfile.direction, 7);
  mergeWeights(environmentWeights, primaryProfile.environmentWeights, 1);
  mergeWeights(environmentWeights, secondaryProfile.environmentWeights, 0.7);
  mergeWeights(behaviorWeights, primaryProfile.behaviorWeights, 1);
  mergeWeights(behaviorWeights, secondaryProfile.behaviorWeights, 0.7);

  if (context.objectProfile.key === "documents") {
    environmentWeights.documentZone = (environmentWeights.documentZone ?? 0) + 8;
    environmentWeights.containerZone = (environmentWeights.containerZone ?? 0) + 2;
  }

  if (context.sceneProfile.profile.hiddenAreas.length > 0) {
    environmentWeights.hiddenCorner = (environmentWeights.hiddenCorner ?? 0) + 2;
  }

  if (context.sceneProfile.profile.commonContainers.length > 0) {
    environmentWeights.containerZone = (environmentWeights.containerZone ?? 0) + 2;
  }

  return {
    source: "lostSong",
    directionWeights,
    environmentWeights,
    behaviorWeights,
    confidence: 0.72,
    reasonTags: [...primaryProfile.reasonTags, ...secondaryProfile.reasonTags]
      .filter((tag, index, array) => array.indexOf(tag) === index)
      .slice(0, 6)
  };
}
