import { EngineInput, HeuristicSignal, ObjectProfileResult } from "@/lib/engine/types";

import { OBJECT_PROFILES } from "@/lib/engine/object/profiles";

function resolveObjectKey(item: string): keyof typeof OBJECT_PROFILES {
  const value = item.toLowerCase();

  if (/key/.test(value)) return "keys";
  if (/wallet|cardholder/.test(value)) return "wallet";
  if (/phone|iphone|android|mobile|remote/.test(value)) return "phone";
  if (/airpods|earbuds|earbud|headphones/.test(value)) return "audio";
  if (/ring|jewelry|necklace|bracelet|earring/.test(value)) return "jewelry";
  if (/passport|document|paper|folder/.test(value)) return "documents";
  if (/glasses|sunglasses|spectacles/.test(value)) return "glasses";
  if (/backpack|bag|purse|tote|briefcase/.test(value)) return "bag";
  if (/camera|dslr|camcorder/.test(value)) return "camera";

  return "other";
}

export function analyzeObjectProfile(input: EngineInput): ObjectProfileResult {
  const key = resolveObjectKey(input.item);
  const profile = OBJECT_PROFILES[key];

  const signal: HeuristicSignal = {
    source: "object",
    directions: key === "audio" || key === "phone" || key === "glasses" ? ["East", "Southeast"] : ["North", "West"],
    environmentTags: [...profile.riskZones.slice(0, 2), ...profile.likelyContainers.slice(0, 2)],
    objectTags: [...profile.physicalTraits.slice(0, 2), ...profile.commonBehaviors.slice(0, 2)],
    weight: 8,
    reason: `Object behavior suggests focusing on how ${profile.label.toLowerCase()} typically gets set down, carried, or visually hidden.`
  };

  return {
    key,
    profile,
    signals: [signal],
    summaryTags: [...profile.searchHints.slice(0, 2), ...profile.riskZones.slice(0, 2)]
  };
}
