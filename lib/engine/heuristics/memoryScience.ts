import { HeuristicWeights } from "@/lib/engine/types";
import { HeuristicContext } from "@/lib/engine/heuristics/types";

export function memoryScienceHeuristic(context: HeuristicContext): HeuristicWeights {
  const { input, timeline, memory } = context;
  const story = input.story.toLowerCase();

  return {
    source: "memoryScience",
    directionWeights: {
      North: memory.patterns.length > 3 ? 5 : 3,
      East: /bedroom|home|hotel|office/i.test(story) ? 5 : 2
    },
    environmentWeights: {
      hiddenCorner: /under|behind|inside|between/i.test(story) ? 12 : 8,
      lowArea: /floor|gap|seat|under/i.test(story) ? 10 : 5,
      containerZone: /bag|pocket|drawer|sleeve|holder|safe/i.test(story) ? 10 : 5
    },
    behaviorWeights: {
      contextShift: Math.min(14, 5 + timeline.transitionPoints.length * 2),
      automaticRoutine: /home|bathroom|office|hotel|gym/i.test(story) ? 10 : 5,
      stateDependentMemory: /shower|meeting|checkout|travel/i.test(story) ? 9 : 4,
      visualBlindness: /small|airpods|ring|keys|glasses/i.test(story) ? 10 : 6
    },
    confidence: 0.76,
    reasonTags: ["context-shift", "automatic-routine", "visual-blindness", "memory-retrieval"]
  };
}
