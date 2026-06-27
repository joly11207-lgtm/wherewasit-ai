import { HeuristicWeights } from "@/lib/engine/types";
import { HeuristicContext } from "@/lib/engine/heuristics/types";

export function tarotHeuristic(context: HeuristicContext): HeuristicWeights {
  const { input, objectProfile, sceneProfile } = context;
  const story = input.story.toLowerCase();

  return {
    source: "tarot",
    directionWeights: {
      Northeast: /passport|documents|wallet/.test(input.item.toLowerCase()) ? 8 : 4,
      East: /phone|airpods|earbuds|glasses/.test(input.item.toLowerCase()) ? 9 : 5,
      Southwest: /ring|jewelry/.test(input.item.toLowerCase()) ? 9 : 4
    },
    environmentWeights: {
      hiddenCorner: 14,
      containerZone: 12,
      storageArea: sceneProfile.profile.commonContainers.length > 0 ? 10 : 5,
      documentZone: objectProfile.key === "documents" ? 10 : 0,
      lowArea: /under|floor|gap|seat/i.test(story) ? 8 : 4
    },
    behaviorWeights: {
      placedTemporarily: 11,
      attentionSplit: /meeting|checkout|packing|shower|driving/i.test(story) ? 9 : 5,
      forgotDuringTransition: 8
    },
    confidence: 0.64,
    reasonTags: ["covered", "personal-belongings", "clothing", "container", "hidden"]
  };
}
