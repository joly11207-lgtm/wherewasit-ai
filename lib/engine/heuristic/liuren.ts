import { Direction, EngineInput, HeuristicSignal } from "@/lib/engine/types";

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
  return seed.split("").reduce((total, char, index) => total + char.charCodeAt(0) * (index + 1), 0);
}

function pickDirections(seed: string): Direction[] {
  const firstIndex = hashValue(seed) % DIRECTIONS.length;
  const secondIndex = (firstIndex + 2) % DIRECTIONS.length;
  return [DIRECTIONS[firstIndex], DIRECTIONS[secondIndex]];
}

function inferEnvironmentTags(input: EngineInput): string[] {
  const story = input.story.toLowerCase();
  const tags = ["indoor", "covered"];

  if (/car|drive|parking/.test(story)) {
    tags.push("vehicle", "gap");
  }
  if (/bathroom|sink|shower|water/.test(story)) {
    tags.push("water", "counter");
  }
  if (/bed|couch|blanket|laundry|towel/.test(story)) {
    tags.push("fabric", "soft-surface");
  }

  return tags;
}

function inferObjectTags(input: EngineInput): string[] {
  const item = input.item.toLowerCase();
  const tags: string[] = [];

  if (/airpods|earbuds|ring|jewelry|glasses|keys/.test(item)) {
    tags.push("small");
  }
  if (/wallet|passport|documents/.test(item)) {
    tags.push("flat");
  }
  if (/phone|airpods|earbuds/.test(item)) {
    tags.push("electronics");
  }
  if (tags.length === 0) {
    tags.push("portable");
  }

  return tags;
}

export function liurenHeuristic(input: EngineInput): HeuristicSignal {
  return {
    source: "liuren",
    directions: pickDirections(`${input.item}:${input.time}:${input.date ?? "unknown"}`),
    environmentTags: inferEnvironmentTags(input),
    objectTags: inferObjectTags(input),
    colorTags: ["gold", "cream"],
    weight: 7,
    reason: "A deterministic directional heuristic leans toward familiar indoor edges and slightly covered search zones."
  };
}
