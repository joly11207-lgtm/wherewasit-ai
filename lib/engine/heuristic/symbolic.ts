import { Direction, EngineInput, HeuristicSignal } from "@/lib/engine/types";

function inferDirections(input: EngineInput): Direction[] {
  const item = input.item.toLowerCase();
  const place = input.place.toLowerCase();

  if (/passport|documents|wallet/.test(item)) {
    return ["Northeast", "East"];
  }
  if (/ring|jewelry/.test(item) || /bathroom/.test(place)) {
    return ["Southwest", "South"];
  }
  if (/airpods|earbuds|phone|glasses/.test(item)) {
    return ["East", "Northwest"];
  }

  return ["North", "Southeast"];
}

function inferEnvironmentTags(input: EngineInput): string[] {
  const place = input.place.toLowerCase();

  if (/car/.test(place)) {
    return ["vehicle", "enclosed", "low-area"];
  }
  if (/office|work/.test(place)) {
    return ["desk", "paper", "chair"];
  }
  if (/bedroom|living room|home/.test(place)) {
    return ["familiar", "soft-surface", "furniture-edge"];
  }
  if (/bathroom|kitchen/.test(place)) {
    return ["water", "counter", "small-drop-zone"];
  }

  return ["familiar", "covered"];
}

export function symbolicHeuristic(input: EngineInput): HeuristicSignal {
  return {
    source: "symbolic",
    directions: inferDirections(input),
    environmentTags: inferEnvironmentTags(input),
    objectTags: ["hidden-plain-sight"],
    colorTags: ["black", "gold"],
    weight: 5,
    reason: "A symbolic pattern heuristic points toward the kind of surface or container where the item would visually blend in."
  };
}
