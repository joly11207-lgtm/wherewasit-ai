import { HeuristicWeights } from "@/lib/engine/types";
import { HeuristicContext } from "@/lib/engine/heuristics/types";

function hourBucket(time: string): "morning" | "afternoon" | "evening" | "night" {
  const value = time.toLowerCase();
  if (/early|morning/.test(value)) return "morning";
  if (/afternoon/.test(value)) return "afternoon";
  if (/evening/.test(value)) return "evening";
  return "night";
}

export function astrologyHeuristic(context: HeuristicContext): HeuristicWeights {
  const { input } = context;
  const bucket = hourBucket(input.time);

  return {
    source: "astrology",
    directionWeights:
      bucket === "morning"
        ? { East: 6, Northeast: 4 }
        : bucket === "afternoon"
          ? { South: 6, West: 4 }
          : bucket === "evening"
            ? { West: 6, Northwest: 4 }
            : { North: 6, Northeast: 4 },
    environmentWeights: {
      highArea: bucket === "morning" ? 4 : 2,
      transitionPath: /travel|hotel|airport|checkout/i.test(input.story.toLowerCase()) ? 8 : 4,
      entryZone: /arriv|check-in/i.test(input.story.toLowerCase()) ? 6 : 2,
      exitPath: /leaving|checkout|boarding/i.test(input.story.toLowerCase()) ? 6 : 2
    },
    behaviorWeights: {
      routineInterruption: 7,
      taskSwitching: 6,
      driving: /driving|car|taxi|rideshare/i.test(input.story.toLowerCase()) ? 8 : 0
    },
    confidence: 0.58,
    reasonTags: [bucket, /travel|hotel|airport/i.test(input.story.toLowerCase()) ? "travel" : "routine", "timing"]
  };
}
