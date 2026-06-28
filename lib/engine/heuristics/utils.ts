import {
  Direction,
  DistanceBand,
  EngineInput,
  HeightBand,
  HeuristicWeights,
  KnowledgeReading,
  MovementState
} from "@/lib/engine/types";

export type TimeBucket =
  | "early_morning"
  | "morning"
  | "afternoon"
  | "evening"
  | "night"
  | "late_night";

const TIME_BUCKET_ORDER: Record<TimeBucket, number> = {
  early_morning: 0,
  morning: 1,
  afternoon: 2,
  evening: 3,
  night: 4,
  late_night: 5
};

export function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function hasPhrase(text: string, phrase: string): boolean {
  const normalizedText = ` ${normalizeText(text)} `;
  const normalizedPhrase = normalizeText(phrase);
  return normalizedPhrase.length > 0 && normalizedText.includes(` ${normalizedPhrase} `);
}

export function hasAnyPhrase(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => hasPhrase(text, phrase));
}

export function countPhraseMatches(text: string, phrases: string[]): number {
  return phrases.reduce((total, phrase) => total + (hasPhrase(text, phrase) ? 1 : 0), 0);
}

export function hashValue(seed: string): number {
  return seed.split("").reduce((total, char, index) => total + char.charCodeAt(0) * (index + 11), 0);
}

export function parseDateSeed(date?: string): { month: number; day: number; year: number; total: number } {
  if (!date) {
    return { month: 0, day: 0, year: 0, total: 0 };
  }

  const match = date.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    const fallback = hashValue(date);
    return { month: 0, day: 0, year: 0, total: fallback };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  return {
    year,
    month,
    day,
    total: year + month + day
  };
}

export function resolveTimeBucket(time: string): TimeBucket {
  const value = normalizeText(time);

  if (value.includes("early morning")) return "early_morning";
  if (value.includes("late night")) return "late_night";
  if (value.includes("morning")) return "morning";
  if (value.includes("afternoon")) return "afternoon";
  if (value.includes("evening")) return "evening";
  if (value.includes("night")) return "night";

  return "morning";
}

export function timeBucketIndex(bucket: TimeBucket): number {
  return TIME_BUCKET_ORDER[bucket];
}

export function buildDeterministicSeed(input: EngineInput): number {
  const dateSeed = parseDateSeed(input.date);
  const bucket = resolveTimeBucket(input.time);
  return (
    hashValue(`${input.item}|${input.place}|${input.story}`) +
    dateSeed.total * 7 +
    timeBucketIndex(bucket) * 19
  );
}

export const CARDINAL_TO_DIRECTION: Record<string, Direction> = {
  north: "North",
  northeast: "Northeast",
  east: "East",
  southeast: "Southeast",
  south: "South",
  southwest: "Southwest",
  west: "West",
  northwest: "Northwest"
};

function round(value: number): number {
  return Number(value.toFixed(2));
}

function includesAny(value: string, terms: string[]): boolean {
  const normalized = normalizeText(value);
  return terms.some((term) => normalized.includes(normalizeText(term)));
}

function pushUnique(target: string[], values: string[], limit = 6): string[] {
  values.forEach((value) => {
    if (!value || target.includes(value) || target.length >= limit) {
      return;
    }

    target.push(value);
  });

  return target;
}

export function readingToHeuristicWeights(source: string, reading: KnowledgeReading): HeuristicWeights {
  const directionWeights: Partial<Record<Direction, number>> = {};
  const environmentWeights: Record<string, number> = {};
  const behaviorWeights: Record<string, number> = {};
  const reasonTags: string[] = [];

  reading.directions.slice(0, 3).forEach((direction, index) => {
    directionWeights[direction] = index === 0 ? 12 : index === 1 ? 8 : 5;
  });

  const allEnvironmentHints = [
    ...reading.environments,
    ...reading.containerHints,
    ...reading.hiddenHints,
    ...reading.colors
  ];

  allEnvironmentHints.forEach((hint) => {
    const normalized = normalizeText(hint);

    if (includesAny(normalized, ["water", "sink", "drain", "bathroom", "shower", "wet"])) {
      environmentWeights.wetArea = (environmentWeights.wetArea ?? 0) + 6;
    }
    if (includesAny(normalized, ["electronics", "charging", "light", "fire", "bright"])) {
      environmentWeights.electronicArea = (environmentWeights.electronicArea ?? 0) + 5;
      environmentWeights.highArea = (environmentWeights.highArea ?? 0) + 2;
    }
    if (includesAny(normalized, ["container", "drawer", "sleeve", "holder", "bag", "pocket", "case", "safe", "box"])) {
      environmentWeights.containerZone = (environmentWeights.containerZone ?? 0) + 6;
      environmentWeights.storageArea = (environmentWeights.storageArea ?? 0) + 4;
    }
    if (includesAny(normalized, ["hidden", "covered", "behind", "under", "corner", "fold"])) {
      environmentWeights.hiddenCorner = (environmentWeights.hiddenCorner ?? 0) + 6;
    }
    if (includesAny(normalized, ["document", "paper", "passport", "receipt"])) {
      environmentWeights.documentZone = (environmentWeights.documentZone ?? 0) + 6;
    }
    if (includesAny(normalized, ["public", "contact", "shared", "people"])) {
      environmentWeights.transitionPath = (environmentWeights.transitionPath ?? 0) + 4;
      environmentWeights.exitPath = (environmentWeights.exitPath ?? 0) + 3;
    }
    if (includesAny(normalized, ["wood", "furniture", "earth", "original place", "familiar"])) {
      environmentWeights.warmArea = (environmentWeights.warmArea ?? 0) + 4;
    }
    if (includesAny(normalized, ["metal", "vehicle", "car"])) {
      environmentWeights.storageArea = (environmentWeights.storageArea ?? 0) + 3;
      environmentWeights.exitPath = (environmentWeights.exitPath ?? 0) + 2;
    }
    if (includesAny(normalized, ["fabric", "clothing", "towel", "blanket", "laundry", "coat"])) {
      environmentWeights.containerZone = (environmentWeights.containerZone ?? 0) + 3;
      environmentWeights.hiddenCorner = (environmentWeights.hiddenCorner ?? 0) + 2;
      environmentWeights.warmArea = (environmentWeights.warmArea ?? 0) + 2;
    }
  });

  if (reading.height === "high") {
    environmentWeights.highArea = (environmentWeights.highArea ?? 0) + 6;
  } else if (reading.height === "middle") {
    environmentWeights.storageArea = (environmentWeights.storageArea ?? 0) + 2;
  } else if (reading.height === "low") {
    environmentWeights.lowArea = (environmentWeights.lowArea ?? 0) + 6;
  }

  if (reading.distance === "near") {
    environmentWeights.containerZone = (environmentWeights.containerZone ?? 0) + 2;
    environmentWeights.warmArea = (environmentWeights.warmArea ?? 0) + 2;
  } else if (reading.distance === "far") {
    environmentWeights.transitionPath = (environmentWeights.transitionPath ?? 0) + 3;
    environmentWeights.exitPath = (environmentWeights.exitPath ?? 0) + 2;
  }

  if (reading.movement === "still") {
    behaviorWeights.automaticRoutine = (behaviorWeights.automaticRoutine ?? 0) + 4;
    behaviorWeights.placedTemporarily = (behaviorWeights.placedTemporarily ?? 0) + 3;
  } else if (reading.movement === "moved") {
    behaviorWeights.forgotDuringTransition = (behaviorWeights.forgotDuringTransition ?? 0) + 5;
    behaviorWeights.attentionSplit = (behaviorWeights.attentionSplit ?? 0) + 4;
    environmentWeights.transitionPath = (environmentWeights.transitionPath ?? 0) + 3;
  } else {
    behaviorWeights.contextShift = (behaviorWeights.contextShift ?? 0) + 3;
    behaviorWeights.visualBlindness = (behaviorWeights.visualBlindness ?? 0) + 2;
  }

  reading.behaviorHints.forEach((hint) => {
    const normalized = normalizeText(hint);

    if (includesAny(normalized, ["routine", "original place", "familiar"])) {
      behaviorWeights.automaticRoutine = (behaviorWeights.automaticRoutine ?? 0) + 4;
    }
    if (includesAny(normalized, ["transition", "moved", "contact", "public"])) {
      behaviorWeights.forgotDuringTransition = (behaviorWeights.forgotDuringTransition ?? 0) + 4;
      behaviorWeights.attentionSplit = (behaviorWeights.attentionSplit ?? 0) + 3;
    }
    if (includesAny(normalized, ["covered", "overlooked", "blind", "hidden"])) {
      behaviorWeights.visualBlindness = (behaviorWeights.visualBlindness ?? 0) + 4;
    }
    if (includesAny(normalized, ["container", "pocket", "drawer", "bag"])) {
      behaviorWeights.placedTemporarily = (behaviorWeights.placedTemporarily ?? 0) + 3;
    }
  });

  pushUnique(reasonTags, reading.environments, 6);
  pushUnique(reasonTags, reading.containerHints, 6);
  pushUnique(reasonTags, reading.hiddenHints, 6);
  pushUnique(reasonTags, reading.behaviorHints, 6);

  return {
    source,
    directionWeights,
    environmentWeights,
    behaviorWeights,
    confidence: round(reading.confidence),
    reasonTags,
    reading
  };
}

export function mergeReadingLists(readings: KnowledgeReading[]) {
  const directions = new Map<Direction, number>();
  const environments = new Map<string, number>();
  const colors = new Map<string, number>();
  const containers = new Map<string, number>();
  const hidden = new Map<string, number>();
  const behaviors = new Map<string, number>();
  const heights = new Map<HeightBand, number>();
  const distances = new Map<DistanceBand, number>();
  const movements = new Map<MovementState, number>();

  const addList = (target: Map<string, number>, values: string[], weight: number) => {
    values.forEach((value) => {
      target.set(value, (target.get(value) ?? 0) + weight);
    });
  };

  readings.forEach((reading) => {
    const weight = reading.confidence;

    reading.directions.forEach((direction, index) => {
      directions.set(direction, (directions.get(direction) ?? 0) + weight * (index === 0 ? 1 : index === 1 ? 0.7 : 0.45));
    });

    addList(environments, reading.environments, weight);
    addList(colors, reading.colors, weight);
    addList(containers, reading.containerHints, weight);
    addList(hidden, reading.hiddenHints, weight);
    addList(behaviors, reading.behaviorHints, weight);
    heights.set(reading.height, (heights.get(reading.height) ?? 0) + weight);
    distances.set(reading.distance, (distances.get(reading.distance) ?? 0) + weight);
    movements.set(reading.movement, (movements.get(reading.movement) ?? 0) + weight);
  });

  const topEntries = (target: Map<string, number>, limit: number) =>
    Array.from(target.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([value]) => value);

  const topKey = <T extends string>(target: Map<T, number>, fallback: T): T =>
    Array.from(target.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallback;

  return {
    finalDirections: topEntries(directions as Map<string, number>, 3) as Direction[],
    finalEnvironments: topEntries(environments, 6),
    finalColors: topEntries(colors, 4),
    finalContainerHints: topEntries(containers, 5),
    finalHiddenHints: topEntries(hidden, 5),
    finalBehaviorHints: topEntries(behaviors, 5),
    finalHeight: topKey(heights, "unknown"),
    finalDistance: topKey(distances, "unknown"),
    finalMovement: topKey(movements, "uncertain")
  };
}
