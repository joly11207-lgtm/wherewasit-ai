import { EngineInput, HeuristicSignal, SceneProfileResult } from "@/lib/engine/types";

import { SCENE_PROFILES } from "@/lib/engine/scene/profiles";

const SCENE_KEYWORDS: Record<keyof typeof SCENE_PROFILES, string[]> = {
  home: ["home", "house", "entryway", "entry", "came inside"],
  bedroom: ["bedroom", "bed", "nightstand", "dresser", "closet"],
  kitchen: ["kitchen", "groceries", "counter", "island", "dish", "dish towel"],
  bathroom: ["bathroom", "sink", "shower", "toiletry", "vanity", "washing hands"],
  car: ["car", "garage", "parking", "seat", "console", "trunk", "rideshare", "taxi"],
  office: ["office", "work", "desk", "school", "meeting", "printer", "laptop"],
  gym: ["gym", "locker", "bench", "changing clothes", "dryer station"],
  cafe: ["cafe", "coffee", "coffee shop", "coffeehouse", "paid for coffee", "latte", "drink pickup", "pickup counter"],
  restaurant: ["restaurant", "dinner", "lunch", "meal", "waiter", "waitress", "menu", "bill", "check", "dining", "booth", "table"],
  hotel: ["hotel", "hotel room", "checkout", "check out", "safe", "nightstand", "luggage area"],
  travel: ["travel", "airport", "gate", "flight", "suitcase", "luggage", "security", "boarding"],
  living_room: ["living room", "couch", "sofa", "coffee table", "tv", "media console"],
  other: []
};

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function hasNormalizedPhrase(text: string, phrase: string): boolean {
  const normalizedText = ` ${normalizeText(text)} `;
  const normalizedPhrase = normalizeText(phrase);
  return normalizedPhrase.length > 0 && normalizedText.includes(` ${normalizedPhrase} `);
}

function countKeywordMatches(text: string, keywords: string[]): number {
  return keywords.reduce((total, keyword) => (hasNormalizedPhrase(text, keyword) ? total + 1 : total), 0);
}

function resolvePlacePriority(place: string): keyof typeof SCENE_PROFILES | null {
  if (hasNormalizedPhrase(place, "cafe") || hasNormalizedPhrase(place, "coffee shop") || hasNormalizedPhrase(place, "coffeehouse")) {
    return "cafe";
  }

  if (
    hasNormalizedPhrase(place, "restaurant") ||
    hasNormalizedPhrase(place, "dinner") ||
    hasNormalizedPhrase(place, "lunch") ||
    hasNormalizedPhrase(place, "booth")
  ) {
    return "restaurant";
  }

  return null;
}

function resolveStoryPriority(story: string): keyof typeof SCENE_PROFILES | null {
  const hasCafeSignal =
    hasNormalizedPhrase(story, "cafe") ||
    hasNormalizedPhrase(story, "coffee") ||
    hasNormalizedPhrase(story, "coffee shop") ||
    hasNormalizedPhrase(story, "latte") ||
    hasNormalizedPhrase(story, "pickup counter") ||
    hasNormalizedPhrase(story, "drink pickup");
  const hasRestaurantSignal =
    hasNormalizedPhrase(story, "restaurant") ||
    hasNormalizedPhrase(story, "dinner") ||
    hasNormalizedPhrase(story, "lunch") ||
    hasNormalizedPhrase(story, "meal") ||
    hasNormalizedPhrase(story, "waiter") ||
    hasNormalizedPhrase(story, "waitress") ||
    hasNormalizedPhrase(story, "menu") ||
    hasNormalizedPhrase(story, "bill") ||
    hasNormalizedPhrase(story, "booth") ||
    hasNormalizedPhrase(story, "dining");
  const hasPaid = hasNormalizedPhrase(story, "paid") || hasNormalizedPhrase(story, "paying");
  const hasTable = hasNormalizedPhrase(story, "table");

  if (hasPaid && (hasCafeSignal || hasTable)) {
    return "cafe";
  }

  if (hasRestaurantSignal) {
    return "restaurant";
  }

  if (hasCafeSignal) {
    return "cafe";
  }

  return null;
}

function resolveSceneKey(input: EngineInput): keyof typeof SCENE_PROFILES {
  const place = normalizeText(input.place);
  const story = normalizeText(input.story);
  const placePriority = resolvePlacePriority(place);

  if (placePriority) {
    return placePriority;
  }

  const storyPriority = resolveStoryPriority(story);
  if (storyPriority) {
    return storyPriority;
  }

  let bestKey: keyof typeof SCENE_PROFILES = "other";
  let bestScore = 0;

  (Object.keys(SCENE_KEYWORDS) as Array<keyof typeof SCENE_PROFILES>).forEach((key) => {
    if (key === "other") {
      return;
    }

    const keywords = SCENE_KEYWORDS[key];
    const placeScore = countKeywordMatches(place, keywords) * 4;
    const storyScore = countKeywordMatches(story, keywords);
    const score = placeScore + storyScore;

    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  });

  return bestScore > 0 ? bestKey : "other";
}

export function analyzeSceneProfile(input: EngineInput): SceneProfileResult {
  const key = resolveSceneKey(input);
  const profile = SCENE_PROFILES[key];
  const environmentalClues = [
    ...profile.hiddenAreas.slice(0, 2),
    ...profile.commonContainers.slice(0, 2),
    ...profile.transitionPoints.slice(0, 2)
  ];

  const signal: HeuristicSignal = {
    source: "scene",
    directions:
      key === "car"
        ? ["West", "Southwest"]
        : key === "office"
          ? ["North", "Northeast"]
          : key === "cafe"
            ? ["West", "Northwest"]
            : key === "restaurant"
              ? ["West", "South"]
          : key === "hotel"
            ? ["East", "Northeast"]
            : key === "travel"
              ? ["North", "East"]
              : ["East", "Southeast"],
    environmentTags: [...profile.zones.slice(0, 2), ...profile.hiddenAreas.slice(0, 2)],
    objectTags: [...profile.commonContainers.slice(0, 2)],
    weight: 3,
    reason: `Scene profile helps land abstract search signals inside the concrete zones and containers of ${profile.label.toLowerCase()}.`
  };

  return {
    key,
    profile,
    signals: [signal],
    environmentalClues
  };
}
