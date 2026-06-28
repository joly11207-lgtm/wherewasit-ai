import {
  DirectionResult,
  EngineInput,
  HeuristicSignal,
  HeuristicWeights,
  InvestigationEngineResult,
  KnowledgeResult,
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
  knowledgeResult: KnowledgeResult;
  timeline: TimelineResult;
  memory: MemoryPatternResult;
  heuristicSignals: HeuristicSignal[];
  heuristicWeights: HeuristicWeights[];
};

type CandidateSource = "zone" | "container" | "hidden";

type SearchCandidate = {
  label: string;
  source: CandidateSource;
  tags: string[];
  score: number;
};

const SCENE_LANDING: Partial<Record<string, Record<string, string[]>>> = {
  car: {
    container: ["center console", "cup holder", "door pocket", "glove box", "back seat pocket", "trunk side pocket"],
    hidden: ["seat gap", "under seat", "floor mat", "back seat pocket"],
    movement: ["driver seat", "passenger seat", "back seat"],
    metal: ["center console", "door pocket"]
  },
  bathroom: {
    water: ["sink counter", "drain edge", "shower shelf", "floor near sink"],
    hidden: ["behind toiletries", "vanity drawer", "towel folds", "laundry basket"],
    container: ["small dish", "drawer organizer", "toiletry bag", "jewelry dish"],
    fabric: ["towel folds", "laundry basket"],
    jewelry: ["sink counter", "drain edge", "jewelry dish"]
  },
  cafe: {
    container: ["bag pocket", "receipt stack", "card holder", "counter area"],
    public: ["payment terminal", "counter area", "chair area", "table edge"],
    transition: ["payment terminal", "counter area", "chair area"],
    document: ["receipt stack", "card holder", "table edge"]
  },
  restaurant: {
    surface: ["dining table", "under menu", "napkin stack", "booth seat"],
    hidden: ["chair gap", "booth gap", "under menu", "napkin stack"],
    public: ["payment counter", "dining table", "coat area"],
    fabric: ["coat area", "napkin stack"]
  },
  hotel: {
    document: ["document sleeve", "passport holder", "desk papers", "hotel safe"],
    container: ["suitcase", "passport holder", "document sleeve", "hotel safe"],
    hidden: ["inside suitcase lining", "under folded clothes", "behind nightstand items"],
    near: ["nightstand", "bed area"]
  },
  kitchen: {
    water: ["sink edge", "drain area", "counter edge", "near soap dispenser"],
    fabric: ["dish towel", "under cutting board"],
    hidden: ["drawer lip", "under cutting board"],
    jewelry: ["sink edge", "drain area", "dish towel"]
  },
  bedroom: {
    fabric: ["under blankets", "pillow folds", "laundry pile", "hoodie pocket"],
    container: ["nightstand drawer", "jewelry tray", "hoodie pocket", "closet shelf"],
    hidden: ["under blankets", "pillow folds", "behind the nightstand"],
    near: ["nightstand", "bedside table", "dresser top"]
  },
  living_room: {
    electronic: ["charging area", "media console", "coffee table", "side table"],
    hidden: ["between cushions", "couch gaps", "under a throw blanket", "rug edge"],
    container: ["remote basket", "blanket basket"],
    fabric: ["between cushions", "under a throw blanket"]
  },
  travel: {
    transition: ["airport security tray", "gate seat", "boarding area", "luggage handle"],
    container: ["backpack pocket", "document sleeve", "passport holder", "seat pocket", "suitcase side pocket"],
    document: ["passport holder", "document sleeve", "airport security tray"],
    public: ["gate seat", "check-in counter", "taxi floor"]
  },
  office: {
    electronic: ["desk surface", "monitor stand", "charging area"],
    container: ["work bag", "laptop sleeve", "desk drawer"],
    hidden: ["under papers", "behind the monitor", "under the desk edge"],
    document: ["under papers", "desk drawer"]
  },
  gym: {
    container: ["gym bag", "locker", "shoe compartment"],
    hidden: ["locker gaps", "bench underside", "bag lining", "towel folds"],
    water: ["shower area", "sink area"],
    fabric: ["towel folds", "gym bag"]
  },
  home: {
    container: ["daily bag", "jacket pocket", "mail stack"],
    hidden: ["under mail", "inside clothing folds", "behind a side table"],
    near: ["entryway", "living room side table", "bedroom surface"]
  }
};

function round(value: number): number {
  return Number(value.toFixed(2));
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function includesAny(value: string, terms: string[]): boolean {
  const normalized = normalize(value);
  return terms.some((term) => normalized.includes(normalize(term)));
}

function uniqueList(values: string[]): string[] {
  return values.filter((value, index) => Boolean(value) && values.indexOf(value) === index);
}

function overlapScore(left: string, right: string): number {
  const leftWords = new Set(normalize(left).split(" ").filter(Boolean));
  const rightWords = new Set(normalize(right).split(" ").filter(Boolean));
  let score = 0;

  leftWords.forEach((word) => {
    if (rightWords.has(word)) {
      score += 1;
    }
  });

  return score;
}

function addWeight(target: Record<string, number>, key: string, amount: number): void {
  if (!amount) {
    return;
  }

  target[key] = round((target[key] ?? 0) + amount);
}

function inferAbstractWeights(knowledgeResult: KnowledgeResult): Record<string, number> {
  const weights: Record<string, number> = {};
  const pushFromText = (value: string, amount: number) => {
    const normalized = normalize(value);

    if (includesAny(normalized, ["container", "drawer", "pocket", "bag", "holder", "sleeve", "case", "safe", "tray"])) {
      addWeight(weights, "container", amount);
    }
    if (includesAny(normalized, ["hidden", "covered", "under", "behind", "fold", "corner", "lining", "gap"])) {
      addWeight(weights, "hidden", amount);
    }
    if (includesAny(normalized, ["water", "sink", "drain", "bathroom", "shower", "wet"])) {
      addWeight(weights, "water", amount);
    }
    if (includesAny(normalized, ["electronic", "charging", "device", "light", "lamp", "outlet"])) {
      addWeight(weights, "electronic", amount);
    }
    if (includesAny(normalized, ["fabric", "towel", "clothing", "blanket", "laundry", "coat", "hoodie", "soft"])) {
      addWeight(weights, "fabric", amount);
    }
    if (includesAny(normalized, ["document", "paper", "passport", "receipt", "folder", "menu"])) {
      addWeight(weights, "document", amount);
    }
    if (includesAny(normalized, ["public", "shared", "people", "counter", "terminal", "gate"])) {
      addWeight(weights, "public", amount);
    }
    if (includesAny(normalized, ["familiar", "private", "indoor", "bedside", "nightstand", "home"])) {
      addWeight(weights, "private", amount);
    }
    if (includesAny(normalized, ["surface", "table", "counter", "desk", "nightstand", "shelf", "stand", "ledge"])) {
      addWeight(weights, "surface", amount);
    }
    if (includesAny(normalized, ["metal", "vehicle", "car"])) {
      addWeight(weights, "metal", amount);
    }
    if (includesAny(normalized, ["wood", "furniture", "dresser"])) {
      addWeight(weights, "wood", amount);
    }
    if (includesAny(normalized, ["transition", "route", "path", "moving", "leaving", "travel"])) {
      addWeight(weights, "transition", amount);
    }
  };

  knowledgeResult.finalEnvironments.forEach((value) => pushFromText(value, 4));
  knowledgeResult.finalContainerHints.forEach((value) => pushFromText(value, 4));
  knowledgeResult.finalHiddenHints.forEach((value) => pushFromText(value, 4));
  knowledgeResult.finalBehaviorHints.forEach((value) => pushFromText(value, 3));
  knowledgeResult.finalColors.forEach((value) => pushFromText(value, 1));

  if (knowledgeResult.finalHeight === "low") addWeight(weights, "lowArea", 5);
  if (knowledgeResult.finalHeight === "high") addWeight(weights, "highArea", 5);
  if (knowledgeResult.finalHeight === "middle") addWeight(weights, "surface", 2);

  if (knowledgeResult.finalDistance === "near") addWeight(weights, "near", 5);
  if (knowledgeResult.finalDistance === "far") addWeight(weights, "far", 5);

  if (knowledgeResult.finalMovement === "moved") addWeight(weights, "movement", 5);
  if (knowledgeResult.finalMovement === "still") addWeight(weights, "still", 5);
  if (knowledgeResult.finalMovement === "uncertain") addWeight(weights, "uncertain", 3);

  return weights;
}

function candidateTags(label: string, source: CandidateSource): string[] {
  const tags = new Set<string>();
  const normalized = normalize(label);

  if (source === "container") tags.add("container");
  if (source === "hidden") tags.add("hidden");

  if (includesAny(normalized, ["drawer", "pocket", "bag", "holder", "sleeve", "basket", "console", "safe", "locker", "suitcase", "tray"])) {
    tags.add("container");
  }
  if (includesAny(normalized, ["under", "behind", "between", "gap", "lining", "fold", "corner", "edge"])) {
    tags.add("hidden");
  }
  if (includesAny(normalized, ["sink", "shower", "drain", "soap", "bathroom", "wet"])) {
    tags.add("water");
  }
  if (includesAny(normalized, ["charging", "monitor", "printer", "outlet", "console", "lamp", "media"])) {
    tags.add("electronic");
  }
  if (includesAny(normalized, ["towel", "blanket", "laundry", "hoodie", "coat", "napkin", "sheets", "pillow"])) {
    tags.add("fabric");
  }
  if (includesAny(normalized, ["passport", "document", "receipt", "paper", "folder", "menu", "desk"])) {
    tags.add("document");
  }
  if (includesAny(normalized, ["counter", "payment", "terminal", "gate", "host", "taxi", "security", "checkout"])) {
    tags.add("public");
    tags.add("transition");
  }
  if (includesAny(normalized, ["bed", "nightstand", "dresser", "closet", "jewelry", "home"])) {
    tags.add("private");
  }
  if (includesAny(normalized, ["table", "counter", "desk", "nightstand", "stand", "surface", "shelf", "ledge"])) {
    tags.add("surface");
  }
  if (includesAny(normalized, ["floor", "under", "drain", "gap", "mat", "rug", "bottom"])) {
    tags.add("lowArea");
  }
  if (includesAny(normalized, ["top", "shelf", "counter", "table", "stand", "ledge"])) {
    tags.add("highArea");
  }

  return Array.from(tags);
}

function buildSceneCandidates(sceneProfile: SceneProfileResult, knowledgeWeights: Record<string, number>, objectKey: string): SearchCandidate[] {
  const byLabel = new Map<string, SearchCandidate>();
  const addCandidate = (label: string, source: CandidateSource) => {
    if (!label) return;
    if (!byLabel.has(label)) {
      byLabel.set(label, {
        label,
        source,
        tags: candidateTags(label, source),
        score: 0
      });
    }
  };

  sceneProfile.profile.zones.forEach((label) => addCandidate(label, "zone"));
  sceneProfile.profile.commonContainers.forEach((label) => addCandidate(label, "container"));
  sceneProfile.profile.hiddenAreas.forEach((label) => addCandidate(label, "hidden"));

  const landing = SCENE_LANDING[sceneProfile.key] ?? {};
  Object.entries(landing).forEach(([tag, labels]) => {
    const baseTag = tag === "jewelry" ? "water" : tag;
    if ((knowledgeWeights[baseTag] ?? 0) <= 0 && tag !== objectKey) {
      return;
    }

    labels.forEach((label) => {
      addCandidate(label, tag === "hidden" ? "hidden" : tag === "container" ? "container" : "zone");
    });
  });

  return Array.from(byLabel.values());
}

function scoreCandidate(
  candidate: SearchCandidate,
  input: FusionInput,
  knowledgeWeights: Record<string, number>
): number {
  const { objectProfile, sceneProfile, knowledgeResult } = input;
  let score = candidate.source === "zone" ? 20 : candidate.source === "container" ? 19 : 18;

  candidate.tags.forEach((tag) => {
    score += (knowledgeWeights[tag] ?? 0) * 1.35;
  });

  if (candidate.source === "container") {
    score += (knowledgeWeights.container ?? 0) * 0.85;
  }
  if (candidate.source === "hidden") {
    score += (knowledgeWeights.hidden ?? 0) * 0.9;
  }

  objectProfile.profile.likelyContainers.forEach((hint) => {
    score += overlapScore(candidate.label, hint) * 4.5;
  });

  objectProfile.profile.riskZones.forEach((hint) => {
    score += overlapScore(candidate.label, hint) * 4.2;
  });

  knowledgeResult.finalContainerHints.forEach((hint) => {
    score += overlapScore(candidate.label, hint) * 4.4;
  });

  knowledgeResult.finalHiddenHints.forEach((hint) => {
    score += overlapScore(candidate.label, hint) * 4.4;
  });

  knowledgeResult.finalEnvironments.forEach((hint) => {
    score += overlapScore(candidate.label, hint) * 3.2;
  });

  if (knowledgeResult.finalDistance === "near" && includesAny(candidate.label, ["nightstand", "dresser", "bag", "drawer", "table", "counter"])) {
    score += 4;
  }
  if (knowledgeResult.finalDistance === "far" && includesAny(candidate.label, ["seat", "gate", "counter", "checkout", "taxi", "trunk", "luggage"])) {
    score += 4;
  }
  if (knowledgeResult.finalMovement === "still" && candidate.source !== "hidden") {
    score += 3;
  }
  if (knowledgeResult.finalMovement === "moved" && includesAny(candidate.label, ["seat", "counter", "path", "bag", "luggage", "console"])) {
    score += 3;
  }

  if (objectProfile.key === "documents" && (candidate.tags.includes("document") || candidate.tags.includes("container"))) {
    score += 8;
  }
  if (objectProfile.key === "jewelry" && (candidate.tags.includes("water") || candidate.tags.includes("fabric") || candidate.tags.includes("hidden"))) {
    score += 8;
  }
  if ((objectProfile.key === "audio" || objectProfile.key === "phone") && (candidate.tags.includes("electronic") || candidate.tags.includes("hidden"))) {
    score += 7;
  }
  if (objectProfile.key === "glasses" && (candidate.tags.includes("surface") || candidate.tags.includes("fabric") || candidate.tags.includes("hidden"))) {
    score += 6;
  }
  if (objectProfile.key === "wallet" && (candidate.tags.includes("container") || candidate.tags.includes("document") || candidate.tags.includes("public"))) {
    score += 7;
  }
  if (objectProfile.key === "keys" && (candidate.tags.includes("container") || includesAny(candidate.label, ["console", "door pocket", "cup holder"]))) {
    score += 6;
  }
  if (objectProfile.key === "bag" && (candidate.tags.includes("container") || includesAny(candidate.label, ["chair", "seat", "luggage"]))) {
    score += 6;
  }
  if (objectProfile.key === "camera" && (candidate.tags.includes("container") || candidate.tags.includes("lowArea"))) {
    score += 6;
  }

  if (sceneProfile.key === "bathroom" && includesAny(candidate.label, ["sink", "drain", "towel", "toiletry", "dish"])) {
    score += 5;
  }
  if (sceneProfile.key === "cafe" && includesAny(candidate.label, ["payment terminal", "receipt stack", "card holder", "bag pocket"])) {
    score += 5;
  }
  if (sceneProfile.key === "restaurant" && includesAny(candidate.label, ["dining table", "under menu", "napkin stack", "chair gap"])) {
    score += 5;
  }
  if (sceneProfile.key === "hotel" && includesAny(candidate.label, ["passport holder", "document sleeve", "suitcase", "hotel safe"])) {
    score += 5;
  }

  return round(score);
}

function buildPriorityWhy(candidate: SearchCandidate, input: FusionInput): string {
  const firstBehavior = input.objectProfile.profile.commonBehaviors[0]?.toLowerCase() ?? "gets set down during routine shifts";
  const firstTransition = input.timeline.transitionPoints[0]?.toLowerCase() ?? "the last clear routine change";
  const firstDirection = input.knowledgeResult.finalDirections[0]?.toLowerCase() ?? input.directions[0]?.direction.toLowerCase() ?? "nearby";

  return `This spot fits ${firstBehavior}, aligns with ${firstTransition}, and matches the strongest ${firstDirection}-leaning spatial signal from the completed investigation.`;
}

function buildSearchPriority(input: FusionInput): SearchPriorityItem[] {
  const knowledgeWeights = inferAbstractWeights(input.knowledgeResult);
  const candidates = buildSceneCandidates(input.sceneProfile, knowledgeWeights, input.objectProfile.key)
    .map((candidate) => ({
      ...candidate,
      score: scoreCandidate(candidate, input, knowledgeWeights)
    }))
    .sort((left, right) => right.score - left.score);

  return candidates.slice(0, 6).map((candidate, index) => ({
    label: candidate.label,
    score: round(candidate.score - index * 0.35),
    why: buildPriorityWhy(candidate, input),
    direction: input.directions[index % input.directions.length]?.direction,
    relatedTags: candidate.tags.slice(0, 5)
  }));
}

function buildEnvironmentalClues(input: FusionInput, searchPriority: SearchPriorityItem[]): string[] {
  const { knowledgeResult, sceneProfile } = input;
  const hiddenTargets = uniqueList([
    ...knowledgeResult.finalHiddenHints,
    ...sceneProfile.profile.hiddenAreas
  ]).slice(0, 3);
  const containerTargets = uniqueList([
    ...knowledgeResult.finalContainerHints,
    ...sceneProfile.profile.commonContainers
  ]).slice(0, 3);

  const clues = [
    hiddenTargets.length > 0 ? `Covered-area signal: ${hiddenTargets.join(", ")}.` : "",
    containerTargets.length > 0 ? `Container signal: ${containerTargets.join(", ")}.` : "",
    knowledgeResult.finalHeight !== "unknown" ? `Height signal: ${knowledgeResult.finalHeight} level surfaces.` : "",
    knowledgeResult.finalColors.length > 0 ? `Color cue: ${knowledgeResult.finalColors.join(", ")}.` : "",
    searchPriority[0] ? `Start with: ${searchPriority[0].label}.` : ""
  ];

  return clues.filter(Boolean);
}

function buildMissingMoments(timeline: TimelineResult): string[] {
  const combined = uniqueList([
    ...timeline.missingMoments,
    ...timeline.attentionShiftMoments,
    ...timeline.transitionPoints
  ]);

  return combined.slice(0, 5);
}

function confidenceScore(input: FusionInput): number {
  const baseKnowledge = input.knowledgeResult.readings.reduce((total, reading) => total + reading.confidence, 0);
  const averageKnowledge = input.knowledgeResult.readings.length > 0 ? baseKnowledge / input.knowledgeResult.readings.length : 0.6;

  let score = 58 + averageKnowledge * 28;
  score += Math.min(input.timeline.steps.length, 4) * 3;
  score += Math.min(input.timeline.transitionPoints.length, 3) * 2;
  score += input.input.story.trim().length > 60 ? 4 : 0;
  score += input.sceneProfile.key !== "other" ? 3 : 0;
  score += input.objectProfile.key !== "other" ? 3 : 0;

  return Math.max(62, Math.min(90, Math.round(score)));
}

function buildCalmSearchPlan(input: FusionInput, searchPriority: SearchPriorityItem[]): string[] {
  const first = searchPriority[0]?.label ?? "the first likely zone";
  const second = searchPriority[1]?.label ?? "the next carry spot";
  const third = searchPriority[2]?.label ?? "the nearest hidden area";
  const transition = input.timeline.transitionPoints[0]?.toLowerCase() ?? "the last routine shift";

  return [
    `Start with ${first} and finish that area completely before moving on.`,
    `Then check ${second} and ${third}, including pockets, folds, and anything stacked on top.`,
    "Use one calm 15-minute pass: visible surfaces first, then containers, then low hidden edges.",
    `If it is not there, retrace ${transition} and repeat the same order once more without rushing.`
  ];
}

export function fuseInvestigation(
  input: FusionInput
): Omit<InvestigationEngineResult, "heuristicWeights" | "promptContext"> {
  const searchPriority = buildSearchPriority(input);
  const environmentalClues = buildEnvironmentalClues(input, searchPriority);
  const missingMoments = buildMissingMoments(input.timeline);
  const calmSearchPlan = buildCalmSearchPlan(input, searchPriority);

  return {
    confidenceScore: confidenceScore(input),
    topDirections: input.directions,
    timeline: input.timeline,
    objectProfile: input.objectProfile,
    sceneProfile: input.sceneProfile,
    knowledgeResult: input.knowledgeResult,
    heuristicSignals: input.heuristicSignals,
    searchPriority,
    environmentalClues,
    missingMoments,
    calmSearchPlan
  };
}
