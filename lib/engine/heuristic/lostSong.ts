import { Direction, EngineInput, HeuristicSignal } from "@/lib/engine/types";

function directionsFromStory(input: EngineInput): Direction[] {
  const story = input.story.toLowerCase();

  if (/car|drive|parking|office|desk/.test(story)) {
    return ["West", "Northwest"];
  }
  if (/bathroom|shower|sink|laundry/.test(story)) {
    return ["South", "Southwest"];
  }
  if (/bedroom|bed|nightstand|couch|living room/.test(story)) {
    return ["East", "Southeast"];
  }

  return ["North", "East"];
}

function environmentTags(input: EngineInput): string[] {
  const story = input.story.toLowerCase();
  const tags = ["room-edge"];

  if (/bag|pocket|jacket|sleeve/.test(story)) {
    tags.push("container");
  }
  if (/checkout|paid|counter|desk|table/.test(story)) {
    tags.push("surface", "handoff");
  }
  if (/left|arrived|packed|packing|meeting/.test(story)) {
    tags.push("transition");
  }

  return tags;
}

function objectTags(input: EngineInput): string[] {
  const item = input.item.toLowerCase();

  if (/wallet|passport|documents/.test(item)) {
    return ["paper-adjacent", "flat", "stackable"];
  }
  if (/airpods|earbuds|phone|glasses/.test(item)) {
    return ["slips-easily", "surface-drop"];
  }

  return ["portable"];
}

export function lostSongHeuristic(input: EngineInput): HeuristicSignal {
  return {
    source: "lostSong",
    directions: directionsFromStory(input),
    environmentTags: environmentTags(input),
    objectTags: objectTags(input),
    colorTags: ["charcoal"],
    weight: 6,
    reason: "A story-shape heuristic emphasizes transition surfaces, container edges, and the first zone after attention shifted."
  };
}
