import {
  BehaviorPattern,
  EngineCandidate,
  ExtractedInput,
  ItemCategory,
  MemoryResult,
  ProbabilityLocation,
  WisdomResult
} from "@/lib/types";

const MEMORY_WEIGHT = 45;
const BEHAVIOR_WEIGHT = 35;
const WISDOM_WEIGHT = 20;

type ScoreBucket = {
  location: string;
  memoryScore: number;
  behaviorScore: number;
  wisdomScore: number;
  reasons: string[];
  hiddenSpots: string[];
  tags: string[];
};

function canonicalizeLocation(location: string): string {
  const value = location.toLowerCase();

  if (value.includes("car")) return "Car seats, console, and floor gaps";
  if (value.includes("bathroom") || value.includes("sink") || value.includes("towel")) {
    return "Bathroom sink, counter, and towel area";
  }
  if (value.includes("laundry") || value.includes("hamper") || value.includes("clothing")) {
    return "Laundry area and clothing pockets";
  }
  if (value.includes("entryway") || value.includes("doorway")) {
    return "Entryway and doorway surfaces";
  }
  if (value.includes("work") || value.includes("office") || value.includes("desk") || value.includes("chair")) {
    return "Work desk, bag, and chair area";
  }
  if (value.includes("bedroom") || value.includes("bedside") || value.includes("nightstand")) {
    return "Bedroom surfaces and bedside area";
  }
  if (value.includes("couch") || value.includes("sofa") || value.includes("cushion")) {
    return "Couch, cushions, and nearby tables";
  }
  if (value.includes("kitchen")) {
    return "Kitchen counter and unloading area";
  }
  if (value.includes("passport") || value.includes("document") || value.includes("folder") || value.includes("suitcase")) {
    return "Travel bag, folder, and document sleeve";
  }
  if (value.includes("pocket") || value.includes("bag") || value.includes("carry spot")) {
    return "Pockets, bags, and enclosed carry spots";
  }

  return location;
}

function addToBucket(
  map: Map<string, ScoreBucket>,
  location: string,
  reason: string,
  hiddenSpots: string[],
  tags: string[]
): ScoreBucket {
  const canonicalLocation = canonicalizeLocation(location);
  const existing = map.get(canonicalLocation);
  if (existing) {
    existing.reasons.push(reason);
    existing.hiddenSpots = Array.from(new Set([...existing.hiddenSpots, ...hiddenSpots]));
    existing.tags = Array.from(new Set([...existing.tags, ...tags]));
    return existing;
  }

  const created: ScoreBucket = {
    location: canonicalLocation,
    memoryScore: 0,
    behaviorScore: 0,
    wisdomScore: 0,
    reasons: [reason],
    hiddenSpots: Array.from(new Set(hiddenSpots)),
    tags: Array.from(new Set(tags))
  };
  map.set(canonicalLocation, created);
  return created;
}

function applyEngineWeights(
  map: Map<string, ScoreBucket>,
  candidates: EngineCandidate[],
  maxContribution: number,
  target: "memoryScore" | "behaviorScore" | "wisdomScore"
): void {
  const aggregated = new Map<
    string,
    { weight: number; reasons: string[]; hiddenSpots: string[]; tags: string[] }
  >();

  candidates.forEach((candidate) => {
    const canonicalLocation = canonicalizeLocation(candidate.location);
    const current = aggregated.get(canonicalLocation);

    if (current) {
      current.weight += candidate.weight;
      current.reasons.push(candidate.reason);
      current.hiddenSpots = Array.from(new Set([...current.hiddenSpots, ...candidate.hiddenSpots]));
      current.tags = Array.from(new Set([...current.tags, ...candidate.tags]));
      return;
    }

    aggregated.set(canonicalLocation, {
      weight: candidate.weight,
      reasons: [candidate.reason],
      hiddenSpots: Array.from(new Set(candidate.hiddenSpots)),
      tags: Array.from(new Set(candidate.tags))
    });
  });

  const maxWeight = Math.max(...Array.from(aggregated.values()).map((candidate) => candidate.weight), 1);

  aggregated.forEach((candidate, location) => {
    const bucket = addToBucket(
      map,
      location,
      candidate.reasons[0],
      candidate.hiddenSpots,
      candidate.tags
    );

    candidate.reasons.slice(1).forEach((reason) => {
      if (!bucket.reasons.includes(reason)) {
        bucket.reasons.push(reason);
      }
    });

    bucket[target] = Number(((candidate.weight / maxWeight) * maxContribution).toFixed(2));
  });
}

function roundScore(value: number): number {
  return Number(Math.min(100, Math.max(0, value)).toFixed(1));
}

function isRecentWithin24Hours(label: string): boolean {
  return label === "very short" || label === "short" || label === "medium";
}

function hasStrongTransition(moments: string[]): boolean {
  return moments.some((moment) =>
    ["Leaving home", "Changing clothes", "Driving", "Traveling"].includes(moment)
  );
}

function isSoftSurfaceLocation(location: string, tags: string[]): boolean {
  const value = location.toLowerCase();
  return (
    value.includes("couch") ||
    value.includes("bed") ||
    value.includes("bedroom") ||
    value.includes("soft") ||
    value.includes("blanket") ||
    value.includes("cushion") ||
    value.includes("bedside") ||
    (tags.includes("fabric") && !tags.includes("enclosed"))
  );
}

function isCarLocation(location: string, tags: string[]): boolean {
  return location.toLowerCase().includes("car") || tags.includes("car");
}

function isBathroomOrLaundryLocation(location: string): boolean {
  const value = location.toLowerCase();
  return (
    value.includes("bathroom") ||
    value.includes("sink") ||
    value.includes("towel") ||
    value.includes("laundry") ||
    value.includes("hamper")
  );
}

function isDocumentAnchorLocation(location: string, tags: string[]): boolean {
  const value = location.toLowerCase();
  return (
    value.includes("bag") ||
    value.includes("folder") ||
    value.includes("document") ||
    value.includes("desk") ||
    value.includes("printer") ||
    tags.includes("work") ||
    tags.includes("enclosed")
  );
}

function isWisdomOnlyLocation(entry: ProbabilityLocation): boolean {
  return entry.memoryScore === 0 && entry.behaviorScore === 0 && entry.wisdomScore > 0;
}

function realismMultiplier(
  entry: ProbabilityLocation,
  input: ExtractedInput,
  itemCategory: ItemCategory,
  memory: MemoryResult
): number {
  let multiplier = 1;
  const lowerItem = input.itemType.toLowerCase();
  const drivingExplicitlyMentioned =
    memory.transitionMoments.includes("Driving") || /\bdrove|driving\b/.test(input.freeText.toLowerCase());
  const recentAndStable =
    isRecentWithin24Hours(memory.timeGapLabel) && !hasStrongTransition(memory.transitionMoments);
  const lastSeenCanonical = canonicalizeLocation(input.lastSeenLocation);

  if (recentAndStable && entry.location === lastSeenCanonical) {
    multiplier *= 1.35;
  }

  const followsSoftSurfaceRule =
    itemCategory === "glasses" ||
    itemCategory === "phone" ||
    itemCategory === "audio" ||
    lowerItem.includes("remote");

  if (followsSoftSurfaceRule && !drivingExplicitlyMentioned) {
    if (isSoftSurfaceLocation(entry.location, entry.tags)) {
      multiplier *= 1.2;
    }
    if (isCarLocation(entry.location, entry.tags)) {
      multiplier *= 0.65;
    }
  }

  if (itemCategory === "jewelry") {
    if (isBathroomOrLaundryLocation(entry.location)) {
      multiplier *= 1.2;
    }
    if (isCarLocation(entry.location, entry.tags)) {
      multiplier *= 0.55;
    }
  }

  if (itemCategory === "documents") {
    if (isDocumentAnchorLocation(entry.location, entry.tags)) {
      multiplier *= 1.18;
    }
    if (isWisdomOnlyLocation(entry)) {
      multiplier *= 0.45;
    }
  }

  return multiplier;
}

export function probabilityEngine(
  input: ExtractedInput,
  itemCategory: ItemCategory,
  memory: MemoryResult,
  behavior: BehaviorPattern[],
  wisdom: WisdomResult
): ProbabilityLocation[] {
  const scores = new Map<string, ScoreBucket>();

  applyEngineWeights(scores, memory.candidates, MEMORY_WEIGHT, "memoryScore");
  applyEngineWeights(scores, behavior, BEHAVIOR_WEIGHT, "behaviorScore");
  applyEngineWeights(scores, wisdom.candidates, WISDOM_WEIGHT, "wisdomScore");

  const scored = Array.from(scores.values())
    .map((entry) => ({
      location: entry.location,
      memoryScore: roundScore(entry.memoryScore),
      behaviorScore: roundScore(entry.behaviorScore),
      wisdomScore: roundScore(entry.wisdomScore),
      score: roundScore(entry.memoryScore + entry.behaviorScore + entry.wisdomScore),
      reasons: entry.reasons.filter((reason, index) => entry.reasons.indexOf(reason) === index),
      hiddenSpots: entry.hiddenSpots,
      tags: entry.tags
    }));

  const adjusted = scored.map((entry) => ({
    ...entry,
    score: roundScore(
      entry.score * realismMultiplier(entry, input, itemCategory, memory)
    )
  }));

  const maxScore = Math.max(...adjusted.map((entry) => entry.score), 1);

  return adjusted
    .map((entry) => ({
      ...entry,
      score: roundScore((entry.score / maxScore) * 100)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}
