import { EngineInput, HeuristicSignal, MemoryPatternResult } from "@/lib/engine/types";

export function analyzeMemoryPatterns(input: EngineInput): {
  result: MemoryPatternResult;
  signals: HeuristicSignal[];
} {
  const story = input.story.toLowerCase();
  const place = input.place.toLowerCase();
  const patterns = [
    "Stress often causes repeated searching in the same obvious places.",
    "Small items are frequently missed in folds, edges, containers, and gaps.",
    "Transition moments are high-risk because attention shifts from one task to another.",
    "The first useful search should be narrow and calm, not broad and frantic."
  ];

  if (/rushed|late|stressed|busy|frantic/.test(story)) {
    patterns.push("Rushed moments often create a false memory of putting the item somewhere more deliberate than what actually happened.");
  }

  if (/car|drove|parking/.test(story)) {
    patterns.push("Vehicle transitions create a second hidden search layer because items can slide out of sight while movement continues.");
  }

  if (/bathroom|sink|shower|laundry/.test(story) || /bathroom/.test(place)) {
    patterns.push("Water and fabric routines create quiet drop points that are easy to overlook on the first pass.");
  }

  const calmProtocol = [
    "Pause for ten seconds and restart from the last confirmed moment.",
    "Search the highest-priority zone with your hands, not only your eyes.",
    "Open every pocket, sleeve, pouch, or folded layer in the first zone.",
    "Only widen out after the first two zones are cleared slowly."
  ];

  const signal: HeuristicSignal = {
    source: "memory",
    directions: /bed|bedroom|couch|living room/i.test(story) ? ["East", "Northeast"] : ["North", "West"],
    environmentTags: ["close-in", "repeat-pass", "covered-area"],
    objectTags: ["calm-search", "memory-anchor"],
    weight: 6,
    reason: "Memory-pattern guidance keeps the search narrow, calm, and anchored to the last reliable moment."
  };

  return {
    result: {
      patterns,
      calmProtocol
    },
    signals: [signal]
  };
}
