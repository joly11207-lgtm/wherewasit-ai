import {
  DirectionResult,
  EngineInput,
  HeuristicSignal,
  HeuristicWeights,
  InvestigationEngineResult,
  MemoryPatternResult,
  ObjectProfileResult,
  SceneProfileResult,
  SearchPriorityItem,
  TimelineResult
} from "@/lib/engine/types";

type FusionInput = {
  input: EngineInput;
  directions: DirectionResult[];
  objectProfile: ObjectProfileResult;
  sceneProfile: SceneProfileResult;
  timeline: TimelineResult;
  memory: MemoryPatternResult;
  heuristicSignals: HeuristicSignal[];
  heuristicWeights: HeuristicWeights[];
};

type SceneCandidate = {
  label: string;
  source: "zone" | "hidden" | "container" | "transition";
};

function clampConfidence(value: number): number {
  return Math.max(68, Math.min(92, Math.round(value)));
}

function confidenceScore({
  input,
  timeline,
  objectProfile,
  sceneProfile
}: Pick<FusionInput, "input" | "timeline" | "objectProfile" | "sceneProfile">): number {
  let score = 74;

  if (input.story.trim().length > 80) score += 5;
  if (input.story.trim().length > 140) score += 3;
  if (!/other/i.test(objectProfile.profile.label)) score += 3;
  if (!/other/i.test(sceneProfile.profile.label)) score += 3;
  if (timeline.steps.length >= 3) score += 4;
  if (timeline.transitionPoints.length >= 2) score += 2;

  const unrelatedPlaceCount = (input.story.match(/\bhome|office|car|hotel|store|gym|airport|restaurant\b/gi) ?? [])
    .map((place) => place.toLowerCase())
    .filter((place, index, array) => array.indexOf(place) === index).length;

  if (!input.story.trim()) score -= 6;
  if (/other/i.test(objectProfile.profile.label)) score -= 3;
  if (/other/i.test(sceneProfile.profile.label)) score -= 3;
  if (unrelatedPlaceCount >= 3) score -= 4;

  return clampConfidence(score);
}

function buildPriorityWhy(
  zone: string,
  objectProfile: ObjectProfileResult,
  timeline: TimelineResult,
  direction: DirectionResult | undefined,
  source: SceneCandidate["source"]
): string {
  const objectBehavior = objectProfile.profile.commonBehaviors[0]?.toLowerCase() ?? "moves during transitions";
  const transition = timeline.transitionPoints[0]?.toLowerCase() ?? "the last clear routine shift";
  const directionText = direction ? `${direction.direction.toLowerCase()}-leaning` : "high-priority";
  const sourceText =
    source === "hidden"
      ? "a hidden-area search"
      : source === "container"
        ? "the most likely carry container"
        : source === "transition"
          ? "the key transition moment"
          : "the core scene zone";

  return `This zone matches ${objectBehavior}, lines up with ${transition}, fits the ${directionText} search signal, and belongs to ${sourceText} for this scene.`;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function wordSet(value: string): Set<string> {
  return new Set(normalize(value).split(" ").filter(Boolean));
}

function overlapScore(left: string, right: string): number {
  const leftWords = wordSet(left);
  const rightWords = wordSet(right);
  let score = 0;

  leftWords.forEach((word) => {
    if (rightWords.has(word)) {
      score += 1;
    }
  });

  return score;
}

function includesAny(value: string, terms: string[]): boolean {
  const normalized = normalize(value);
  return terms.some((term) => normalized.includes(term));
}

function sceneCandidates(sceneProfile: SceneProfileResult): SceneCandidate[] {
  return [
    ...sceneProfile.profile.zones.slice(0, 5).map((label) => ({ label, source: "zone" as const })),
    ...sceneProfile.profile.hiddenAreas.slice(0, 4).map((label) => ({ label, source: "hidden" as const })),
    ...sceneProfile.profile.commonContainers.slice(0, 4).map((label) => ({ label, source: "container" as const })),
    ...sceneProfile.profile.transitionPoints.slice(0, 3).map((label) => ({ label, source: "transition" as const }))
  ].filter((candidate, index, array) => array.findIndex((entry) => entry.label === candidate.label) === index);
}

function sceneLocalBoost(candidate: SceneCandidate, sceneProfile: SceneProfileResult): number {
  const label = candidate.label.toLowerCase();

  if (sceneProfile.key === "car") {
    if (includesAny(label, ["center console", "door pocket"])) {
      return 14;
    }
    if (includesAny(label, ["seat gap", "cup holder"])) {
      return 12;
    }
    if (includesAny(label, ["floor mat"])) {
      return 8;
    }
    if (includesAny(label, ["trunk", "back seat", "under seat"])) {
      return 6;
    }
    if (includesAny(label, ["console outlet", "charging cable"])) {
      return 4;
    }
  }

  if (sceneProfile.key === "restaurant") {
    if (includesAny(label, ["dining table", "booth seat", "chair gap", "under menu", "coat area", "napkin stack"])) {
      return 10;
    }
    if (includesAny(label, ["chair area", "payment counter", "host stand", "coat pocket"])) {
      return 6;
    }
  }

  if (sceneProfile.key === "cafe") {
    if (includesAny(label, ["payment terminal", "receipt stack", "counter area", "bag pocket", "card holder"])) {
      return 10;
    }
    if (includesAny(label, ["chair area", "table edge", "cafe table", "under table edge"])) {
      return 7;
    }
  }

  if (sceneProfile.key === "travel") {
    if (includesAny(label, ["airport security tray", "passport holder", "document sleeve", "backpack", "backpack pocket"])) {
      return 11;
    }
    if (includesAny(label, ["seat pocket", "suitcase side pocket", "boarding area", "gate seat", "luggage handle"])) {
      return 8;
    }
    if (includesAny(label, ["taxi floor", "tray corner", "bag lining"])) {
      return 6;
    }
  }

  if (sceneProfile.key === "living_room") {
    if (includesAny(label, ["between cushions", "under a throw blanket", "couch gaps", "blanket folds", "media console"])) {
      return 10;
    }
    if (includesAny(label, ["coffee table", "side table", "charging area", "remote basket", "rug edge"])) {
      return 7;
    }
  }

  if (sceneProfile.key === "bedroom") {
    if (includesAny(label, ["nightstand", "bedside table", "nightstand drawer", "under blankets", "pillow folds", "jewelry tray"])) {
      return 10;
    }
    if (includesAny(label, ["drawer lip", "dresser top", "laundry pile", "closet shelf", "hoodie pocket"])) {
      return 7;
    }
  }

  if (sceneProfile.key === "kitchen") {
    if (includesAny(label, ["sink area", "sink edge", "drain area", "under a dish towel", "counter edge", "drawer lip"])) {
      return 8;
    }
  }

  return 0;
}

function itemSceneAffinityBoost(
  candidate: SceneCandidate,
  objectProfile: ObjectProfileResult,
  sceneProfile: SceneProfileResult
): number {
  const label = candidate.label.toLowerCase();

  if (objectProfile.key === "glasses" && (sceneProfile.key === "restaurant" || sceneProfile.key === "cafe")) {
    if (includesAny(label, ["dining table", "booth seat", "coat area"])) {
      return 16;
    }
    if (includesAny(label, ["cafe table", "table edge", "under menu", "napkin stack", "chair gap", "booth gap"])) {
      return 13;
    }
    if (includesAny(label, ["coat area", "coat pocket", "bag pocket", "chair area", "host stand", "payment terminal"])) {
      return 8;
    }
  }

  if (objectProfile.key === "wallet" && sceneProfile.key === "cafe") {
    if (includesAny(label, ["payment terminal", "receipt stack", "bag pocket", "card holder", "counter area"])) {
      return 12;
    }
    if (includesAny(label, ["table edge", "chair area", "cafe table", "wallet"])) {
      return 8;
    }
  }

  if (sceneProfile.key === "car" && objectProfile.key === "keys") {
    if (includesAny(label, ["center console", "door pocket"])) {
      return 16;
    }
    if (includesAny(label, ["seat gap", "cup holder"])) {
      return 13;
    }
    if (includesAny(label, ["floor mat"])) {
      return 9;
    }
    if (includesAny(label, ["jacket pocket", "driver seat"])) {
      return 8;
    }
  }

  if (sceneProfile.key === "car" && objectProfile.key === "wallet") {
    if (includesAny(label, ["center console", "door pocket", "cup holder"])) {
      return 14;
    }
    if (includesAny(label, ["seat gap", "back seat pocket"])) {
      return 8;
    }
  }

  if (sceneProfile.key === "car" && objectProfile.key === "camera") {
    if (includesAny(label, ["center console", "door pocket", "seat gap"])) {
      return 14;
    }
    if (includesAny(label, ["camera bag", "trunk", "back seat", "trunk side pocket", "floor mat"])) {
      return 11;
    }
    if (includesAny(label, ["cup holder", "under seat rail"])) {
      return 7;
    }
  }

  if (sceneProfile.key === "car" && objectProfile.key === "phone") {
    if (includesAny(label, ["center console", "door pocket", "seat gap"])) {
      return 14;
    }
    if (includesAny(label, ["cup holder", "floor mat"])) {
      return 11;
    }
    if (includesAny(label, ["back seat pocket", "charging cable"])) {
      return 7;
    }
  }

  if (sceneProfile.key === "living_room" && (objectProfile.key === "audio" || objectProfile.key === "phone")) {
    if (includesAny(label, ["between cushions", "under a throw blanket", "couch gaps", "media console", "charging area"])) {
      return 13;
    }
    if (includesAny(label, ["coffee table", "side table", "remote basket", "blanket folds"])) {
      return 9;
    }
  }

  if (sceneProfile.key === "living_room" && (objectProfile.key === "glasses" || objectProfile.key === "keys")) {
    if (includesAny(label, ["coffee table", "side table", "between cushions", "couch gaps", "rug edge"])) {
      return 11;
    }
  }

  if (sceneProfile.key === "bedroom" && objectProfile.key === "jewelry") {
    if (includesAny(label, ["under blankets", "nightstand drawer", "jewelry tray", "hoodie pocket"])) {
      return 13;
    }
    if (includesAny(label, ["bedside table", "nightstand", "dresser top", "pillow folds", "closet shelf"])) {
      return 9;
    }
  }

  if (sceneProfile.key === "bedroom" && (objectProfile.key === "phone" || objectProfile.key === "glasses" || objectProfile.key === "wallet")) {
    if (includesAny(label, ["nightstand", "bedside table", "under blankets", "pillow folds", "drawer lip"])) {
      return 11;
    }
  }

  if (sceneProfile.key === "travel" && objectProfile.key === "documents") {
    if (includesAny(label, ["airport security tray", "passport holder", "document sleeve", "backpack", "backpack pocket"])) {
      return 14;
    }
    if (includesAny(label, ["seat pocket", "suitcase side pocket", "boarding area", "tray corner"])) {
      return 9;
    }
  }

  if (sceneProfile.key === "travel" && objectProfile.key === "bag") {
    if (includesAny(label, ["airport security tray", "backpack", "backpack pocket", "bag lining", "suitcase side pocket"])) {
      return 13;
    }
    if (includesAny(label, ["gate seat", "seat pocket", "boarding area", "luggage handle"])) {
      return 8;
    }
  }

  if (sceneProfile.key === "travel" && (objectProfile.key === "phone" || objectProfile.key === "wallet" || objectProfile.key === "audio")) {
    if (includesAny(label, ["seat pocket", "gate seat", "airport security tray", "backpack pocket", "taxi floor"])) {
      return 10;
    }
  }

  if (sceneProfile.key === "kitchen" && objectProfile.key === "jewelry") {
    if (includesAny(label, ["sink area", "sink edge", "drain area", "under a dish towel", "counter edge", "drawer lip"])) {
      return 12;
    }
    if (includesAny(label, ["under cutting board", "near soap dispenser", "sink area"])) {
      return 8;
    }
  }

  if (sceneProfile.key === "hotel" && objectProfile.key === "bag") {
    if (includesAny(label, ["backpack pocket", "suitcase", "under bed edge", "luggage area"])) {
      return 10;
    }
  }

  return 0;
}

function objectBoost(
  candidate: SceneCandidate,
  objectProfile: ObjectProfileResult,
  sceneProfile: SceneProfileResult
): number {
  const label = candidate.label.toLowerCase();
  let boost = 0;

  objectProfile.profile.likelyContainers.forEach((container) => {
    boost += overlapScore(candidate.label, container) * 6;
  });
  objectProfile.profile.riskZones.forEach((zone) => {
    boost += overlapScore(candidate.label, zone) * 4;
  });
  objectProfile.profile.searchHints.forEach((hint) => {
    boost += overlapScore(candidate.label, hint) * 2;
  });

  if (objectProfile.key === "documents") {
    if (includesAny(label, ["passport", "document", "suitcase", "desk", "safe", "checkout"])) {
      boost += 10;
    }
  }

  if (objectProfile.key === "wallet") {
    if (includesAny(label, ["payment terminal", "receipt", "card holder", "bag pocket"])) {
      boost += 10;
    }
    if (includesAny(label, ["counter area", "chair area", "table", "checkout", "paying"])) {
      boost += 7;
    }
  }

  if (objectProfile.key === "phone") {
    if (includesAny(label, ["desk", "chair", "meeting", "printer", "laptop", "bag"])) {
      boost += 8;
    }
    if (includesAny(label, ["couch", "bed", "blanket"])) {
      boost -= 10;
    }
  }

  if (objectProfile.key === "audio") {
    if (includesAny(label, ["locker", "bench", "bag", "gap", "charging", "sink"])) {
      boost += 8;
    }
  }

  if (objectProfile.key === "jewelry") {
    if (includesAny(label, ["sink", "bathroom", "toiletry", "towel", "counter"])) {
      boost += 8;
    }
  }

  boost += sceneLocalBoost(candidate, sceneProfile);
  boost += itemSceneAffinityBoost(candidate, objectProfile, sceneProfile);

  return boost;
}

function timelineBoost(candidate: SceneCandidate, timeline: TimelineResult): number {
  const timelineText = [...timeline.steps, ...timeline.transitionPoints, ...timeline.missingMoments].join(" ");
  let boost = overlapScore(candidate.label, timelineText) * 5;

  if (candidate.source === "transition") {
    boost += 2;
  }
  if (candidate.source === "hidden") {
    boost += 3;
  }
  if (candidate.source === "container") {
    boost += 4;
  }

  return boost;
}

function heuristicEnvironmentBoost(candidate: SceneCandidate, heuristicWeights: HeuristicWeights[]): number {
  const totals = heuristicWeights.reduce<Record<string, number>>((accumulator, heuristic) => {
    Object.entries(heuristic.environmentWeights).forEach(([key, value]) => {
      accumulator[key] = (accumulator[key] ?? 0) + value * heuristic.confidence;
    });
    return accumulator;
  }, {});

  let boost = 0;

  if (candidate.source === "hidden") {
    boost += (totals.hiddenCorner ?? 0) * 0.6;
    boost += (totals.lowArea ?? 0) * 0.35;
  }
  if (candidate.source === "container") {
    boost += (totals.containerZone ?? 0) * 0.65;
    boost += (totals.storageArea ?? 0) * 0.45;
    boost += (totals.documentZone ?? 0) * 0.35;
  }
  if (candidate.source === "transition") {
    boost += (totals.transitionPath ?? 0) * 0.7;
    boost += (totals.entryZone ?? 0) * 0.4;
    boost += (totals.exitPath ?? 0) * 0.4;
  }
  if (candidate.source === "zone") {
    boost += (totals.wetArea ?? 0) * 0.3;
    boost += (totals.electronicArea ?? 0) * 0.3;
    boost += (totals.warmArea ?? 0) * 0.25;
  }

  return Math.min(boost, 14);
}

function heuristicBehaviorBoost(candidate: SceneCandidate, heuristicWeights: HeuristicWeights[]): number {
  const totals = heuristicWeights.reduce<Record<string, number>>((accumulator, heuristic) => {
    Object.entries(heuristic.behaviorWeights).forEach(([key, value]) => {
      accumulator[key] = (accumulator[key] ?? 0) + value * heuristic.confidence;
    });
    return accumulator;
  }, {});

  let boost = 0;

  if (candidate.source === "transition") {
    boost += ((totals.forgotDuringTransition ?? 0) + (totals.attentionSplit ?? 0)) * 0.35;
    boost += ((totals.routineInterruption ?? 0) + (totals.taskSwitching ?? 0)) * 0.2;
  }
  if (candidate.source === "container") {
    boost += ((totals.placedTemporarily ?? 0) + (totals.packing ?? 0) + (totals.unpacking ?? 0)) * 0.28;
    boost += ((totals.contextShift ?? 0) + (totals.automaticRoutine ?? 0)) * 0.12;
  }
  if (candidate.source === "hidden") {
    boost += ((totals.visualBlindness ?? 0) + (totals.stateDependentMemory ?? 0)) * 0.28;
    boost += (totals.contextShift ?? 0) * 0.15;
  }

  return Math.min(boost, 12);
}

function buildSearchPriority(input: FusionInput): SearchPriorityItem[] {
  const directionOne = input.directions[0];
  const directionTwo = input.directions[1];

  const ranked = sceneCandidates(input.sceneProfile)
    .map((candidate) => ({
      candidate,
      score:
        (candidate.source === "zone"
          ? 84
          : candidate.source === "hidden"
            ? 82
            : candidate.source === "container"
              ? 80
              : 77) +
        objectBoost(candidate, input.objectProfile, input.sceneProfile) +
        timelineBoost(candidate, input.timeline) +
        heuristicEnvironmentBoost(candidate, input.heuristicWeights) +
        heuristicBehaviorBoost(candidate, input.heuristicWeights)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return ranked.map(({ candidate, score }, index) => ({
    label: candidate.label,
    score: Math.max(72, Math.min(93, Math.round(score - index))),
    direction: index % 2 === 0 ? directionOne?.direction : directionTwo?.direction,
    why: buildPriorityWhy(
      candidate.label,
      input.objectProfile,
      input.timeline,
      index % 2 === 0 ? directionOne : directionTwo,
      candidate.source
    ),
    relatedTags: [
      input.sceneProfile.key,
      input.objectProfile.key,
      candidate.source,
      input.timeline.transitionPoints[index % Math.max(input.timeline.transitionPoints.length, 1)] ?? "transition",
      input.objectProfile.profile.searchHints[index % input.objectProfile.profile.searchHints.length] ?? "search-hint"
    ]
  }));
}

export function fuseInvestigation(
  input: FusionInput
): Omit<InvestigationEngineResult, "promptContext" | "heuristicWeights"> {
  const searchPriority = buildSearchPriority(input);
  const confidence = confidenceScore(input);
  const environmentalClues = [
    ...input.sceneProfile.environmentalClues,
    ...input.objectProfile.profile.riskZones.slice(0, 2),
    ...input.heuristicSignals.flatMap((signal) => signal.environmentTags.slice(0, 1))
  ].filter((value, index, array) => array.indexOf(value) === index).slice(0, 6);

  const calmSearchPlan = [
    ...input.memory.calmProtocol.slice(0, 3),
    ...searchPriority.slice(0, 2).map((priority, index) =>
      `${index === 0 ? "Start with" : "Then check"} ${priority.label.toLowerCase()}.`
    )
  ].slice(0, 5);

  return {
    confidenceScore: confidence,
    topDirections: input.directions,
    timeline: input.timeline,
    objectProfile: input.objectProfile,
    sceneProfile: input.sceneProfile,
    heuristicSignals: input.heuristicSignals,
    searchPriority,
    environmentalClues,
    missingMoments: input.timeline.missingMoments,
    calmSearchPlan
  };
}
