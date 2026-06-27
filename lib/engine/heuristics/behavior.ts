import { HeuristicWeights } from "@/lib/engine/types";
import { HeuristicContext } from "@/lib/engine/heuristics/types";

function countMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length;
}

export function behaviorHeuristic(context: HeuristicContext): HeuristicWeights {
  const { input, timeline } = context;
  const story = input.story.toLowerCase();
  const attentionSplit = Math.min(18, 4 + timeline.attentionShiftMoments.length * 4 + countMatches(story, /\bmeeting|checkout|packing|shower|driving\b/g));
  const taskSwitching = Math.min(14, 4 + timeline.transitionPoints.length * 3);

  return {
    source: "behavior",
    directionWeights: {
      East: /desk|counter|bag/i.test(story) ? 5 : 2,
      West: /car|parking|driving/i.test(story) ? 5 : 2
    },
    environmentWeights: {
      transitionPath: Math.min(14, 5 + timeline.transitionPoints.length * 2),
      containerZone: /bag|pocket|sleeve|holder|case/i.test(story) ? 12 : 5,
      storageArea: /drawer|safe|locker|suitcase/i.test(story) ? 10 : 4
    },
    behaviorWeights: {
      attentionSplit,
      routineInterruption: /late|rushed|busy|frantic/i.test(story) ? 12 : 6,
      placedTemporarily: /set|put|left|placed|dropped/i.test(story) ? 12 : 6,
      taskSwitching,
      fatigue: /tired|late night|night/i.test(story) ? 8 : 3,
      packing: /packing|packed|luggage|suitcase/i.test(story) ? 12 : 0,
      unpacking: /unload|groceries|came home/i.test(story) ? 10 : 0,
      driving: /drive|driving|car|taxi|rideshare/i.test(story) ? 10 : 0,
      phoneDistraction: /phone|text|call|notification/i.test(story) ? 7 : 0
    },
    confidence: 0.78,
    reasonTags: ["transition", "task-switch", "temporary-placement", "container"].slice(0, 4)
  };
}
