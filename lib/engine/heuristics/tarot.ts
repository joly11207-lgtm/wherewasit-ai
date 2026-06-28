import { Direction, HeuristicWeights } from "@/lib/engine/types";
import { HeuristicContext } from "@/lib/engine/heuristics/types";
import { buildDeterministicSeed, hasAnyPhrase } from "@/lib/engine/heuristics/utils";

type ArchetypeKey =
  | "hidden"
  | "covered"
  | "inside_container"
  | "near_clothing"
  | "near_documents"
  | "near_water"
  | "near_electronics"
  | "overlooked_surface"
  | "transition"
  | "public_contact"
  | "routine_blindness"
  | "under_object"
  | "near_personal_item";

type ArchetypeProfile = {
  directionWeights: Partial<Record<Direction, number>>;
  environmentWeights: Record<string, number>;
  behaviorWeights: Record<string, number>;
  reasonTags: string[];
};

const ARCHETYPES: Record<ArchetypeKey, ArchetypeProfile> = {
  hidden: {
    directionWeights: { Northeast: 5, North: 3 },
    environmentWeights: { hiddenCorner: 10, lowArea: 6 },
    behaviorWeights: { visualBlindness: 7, contextShift: 5 },
    reasonTags: ["hidden", "covered", "blind-spot"]
  },
  covered: {
    directionWeights: { Southwest: 4, Northeast: 3 },
    environmentWeights: { hiddenCorner: 8, storageArea: 5 },
    behaviorWeights: { visualBlindness: 6, placedTemporarily: 5 },
    reasonTags: ["covered", "soft-layer", "under-object"]
  },
  inside_container: {
    directionWeights: { Southeast: 4, East: 3 },
    environmentWeights: { containerZone: 10, storageArea: 7 },
    behaviorWeights: { placedTemporarily: 7, contextShift: 5 },
    reasonTags: ["inside-container", "bag-pocket", "drawer"]
  },
  near_clothing: {
    directionWeights: { Southeast: 4, East: 3 },
    environmentWeights: { containerZone: 8, warmArea: 4 },
    behaviorWeights: { automaticRoutine: 6, placedTemporarily: 5 },
    reasonTags: ["clothing", "fabric", "personal-layer"]
  },
  near_documents: {
    directionWeights: { Northeast: 5, North: 4 },
    environmentWeights: { documentZone: 10, containerZone: 6, storageArea: 5 },
    behaviorWeights: { taskSwitching: 5, contextShift: 4 },
    reasonTags: ["documents", "sleeve", "desk-surface"]
  },
  near_water: {
    directionWeights: { North: 6, Northeast: 3 },
    environmentWeights: { wetArea: 9, lowArea: 4 },
    behaviorWeights: { placedTemporarily: 6, stateDependentMemory: 5 },
    reasonTags: ["water", "sink", "bathroom"]
  },
  near_electronics: {
    directionWeights: { South: 5, East: 3 },
    environmentWeights: { electronicArea: 10, highArea: 4 },
    behaviorWeights: { taskSwitching: 6, attentionSplit: 5 },
    reasonTags: ["electronics", "charging", "visible-surface"]
  },
  overlooked_surface: {
    directionWeights: { South: 4, East: 4 },
    environmentWeights: { highArea: 7, entryZone: 4 },
    behaviorWeights: { visualBlindness: 7, placedTemporarily: 5 },
    reasonTags: ["overlooked-surface", "visible", "set-down"]
  },
  transition: {
    directionWeights: { East: 5, West: 4 },
    environmentWeights: { transitionPath: 10, exitPath: 5, entryZone: 4 },
    behaviorWeights: { forgotDuringTransition: 8, attentionSplit: 6 },
    reasonTags: ["transition", "handoff", "movement"]
  },
  public_contact: {
    directionWeights: { West: 5, Northwest: 4 },
    environmentWeights: { transitionPath: 8, exitPath: 6 },
    behaviorWeights: { routineInterruption: 8, attentionSplit: 6 },
    reasonTags: ["public-contact", "shared-surface", "interruption"]
  },
  routine_blindness: {
    directionWeights: { East: 4, North: 3 },
    environmentWeights: { hiddenCorner: 6, storageArea: 5 },
    behaviorWeights: { automaticRoutine: 8, visualBlindness: 7 },
    reasonTags: ["routine-blindness", "habit", "missed-on-second-look"]
  },
  under_object: {
    directionWeights: { Northeast: 4, Southwest: 4 },
    environmentWeights: { hiddenCorner: 8, lowArea: 6 },
    behaviorWeights: { visualBlindness: 7, placedTemporarily: 4 },
    reasonTags: ["under-object", "blocked-view", "low-surface"]
  },
  near_personal_item: {
    directionWeights: { Southeast: 4, West: 3 },
    environmentWeights: { containerZone: 8, warmArea: 4 },
    behaviorWeights: { contextShift: 6, automaticRoutine: 5 },
    reasonTags: ["personal-item", "next-to-belongings", "carry-zone"]
  }
};

function chooseArchetypes(context: HeuristicContext): ArchetypeKey[] {
  const { input, objectProfile, sceneProfile } = context;
  const story = input.story.toLowerCase();
  const archetypes: ArchetypeKey[] = [];

  if (sceneProfile.profile.hiddenAreas.length > 0 || hasAnyPhrase(story, ["under", "behind", "inside", "between"])) {
    archetypes.push("hidden");
  }
  if (objectProfile.key === "documents") archetypes.push("near_documents");
  if (objectProfile.key === "audio" || objectProfile.key === "phone") archetypes.push("near_electronics");
  if (sceneProfile.profile.wetAreas?.length || hasAnyPhrase(story, ["sink", "bathroom", "shower", "water"])) {
    archetypes.push("near_water");
  }
  if (hasAnyPhrase(story, ["bag", "pocket", "drawer", "holder", "sleeve", "case"])) {
    archetypes.push("inside_container");
  }
  if (hasAnyPhrase(story, ["jacket", "hoodie", "coat", "clothes", "blanket", "towel"])) {
    archetypes.push("near_clothing");
  }
  if (hasAnyPhrase(story, ["meeting", "checkout", "boarding", "security", "paying", "packing"])) {
    archetypes.push("transition");
  }
  if (hasAnyPhrase(story, ["restaurant", "cafe", "airport", "lobby", "taxi", "rideshare"])) {
    archetypes.push("public_contact");
  }
  if (hasAnyPhrase(story, ["set", "left", "placed", "put it down", "visible"])) {
    archetypes.push("overlooked_surface");
  }
  if (hasAnyPhrase(story, ["routine", "usual", "normally", "watching tv", "getting ready"])) {
    archetypes.push("routine_blindness");
  }
  if (hasAnyPhrase(story, ["under", "beneath", "under menu", "under towel"])) {
    archetypes.push("under_object");
  }
  if (hasAnyPhrase(story, ["bag", "wallet", "passport", "phone", "coat", "charger"])) {
    archetypes.push("near_personal_item");
  }

  const unique = archetypes.filter((value, index) => archetypes.indexOf(value) === index);
  if (unique.length >= 2) {
    return unique.slice(0, 2);
  }

  const fallbackKeys = Object.keys(ARCHETYPES) as ArchetypeKey[];
  const seed = buildDeterministicSeed(input);
  const fallback = fallbackKeys[seed % fallbackKeys.length];
  return [...unique, fallback].filter((value, index, array) => array.indexOf(value) === index).slice(0, 2);
}

function mergeDirections(
  target: Partial<Record<Direction, number>>,
  source: Partial<Record<Direction, number>>,
  scale: number
): void {
  Object.entries(source).forEach(([direction, value]) => {
    target[direction as Direction] = Number((((target[direction as Direction] ?? 0) + value * scale)).toFixed(2));
  });
}

function mergeMap(target: Record<string, number>, source: Record<string, number>, scale: number): void {
  Object.entries(source).forEach(([key, value]) => {
    target[key] = Number((((target[key] ?? 0) + value * scale)).toFixed(2));
  });
}

export function tarotHeuristic(context: HeuristicContext): HeuristicWeights {
  const selected = chooseArchetypes(context);
  const directionWeights: Partial<Record<Direction, number>> = {};
  const environmentWeights: Record<string, number> = {};
  const behaviorWeights: Record<string, number> = {};

  selected.forEach((key, index) => {
    const profile = ARCHETYPES[key];
    const scale = index === 0 ? 1 : 0.72;
    mergeDirections(directionWeights, profile.directionWeights, scale);
    mergeMap(environmentWeights, profile.environmentWeights, scale);
    mergeMap(behaviorWeights, profile.behaviorWeights, scale);
  });

  if (context.objectProfile.key === "documents") {
    environmentWeights.documentZone = (environmentWeights.documentZone ?? 0) + 2;
  }

  return {
    source: "tarot",
    directionWeights,
    environmentWeights,
    behaviorWeights,
    confidence: 0.66,
    reasonTags: selected
      .flatMap((key) => ARCHETYPES[key].reasonTags)
      .filter((tag, index, array) => array.indexOf(tag) === index)
      .slice(0, 6)
  };
}
