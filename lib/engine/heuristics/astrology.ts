import { Direction, HeuristicWeights, KnowledgeReading } from "@/lib/engine/types";
import { HeuristicContext } from "@/lib/engine/heuristics/types";
import {
  parseDateSeed,
  readingToHeuristicWeights,
  resolveTimeBucket,
  timeBucketIndex,
  TimeBucket
} from "@/lib/engine/heuristics/utils";

type TimeSymbolKey = "dawn" | "day" | "dusk" | "night";

type TimeSymbolProfile = {
  directions: Direction[];
  environments: string[];
  colors: string[];
  height: KnowledgeReading["height"];
  distance: KnowledgeReading["distance"];
  movement: KnowledgeReading["movement"];
  containerHints: string[];
  hiddenHints: string[];
  behaviorHints: string[];
};

const TIME_SYMBOLS: Record<TimeSymbolKey, TimeSymbolProfile> = {
  dawn: {
    directions: ["East", "Southeast"],
    environments: ["entry route", "fresh surface", "private room"],
    colors: ["gold", "pale green"],
    height: "middle",
    distance: "near",
    movement: "moved",
    containerHints: ["day bag", "entry tray"],
    hiddenHints: ["near the first surface used"],
    behaviorHints: ["morning routine shift", "item placed before leaving"]
  },
  day: {
    directions: ["South", "East"],
    environments: ["visible surface", "work area", "public route"],
    colors: ["amber", "white"],
    height: "high",
    distance: "middle",
    movement: "moved",
    containerHints: ["desk organizer", "bag sleeve"],
    hiddenHints: ["beside active clutter"],
    behaviorHints: ["task switching", "attention split in daylight activity"]
  },
  dusk: {
    directions: ["West", "Northwest"],
    environments: ["return path", "carry layer", "shared surface"],
    colors: ["bronze", "gray"],
    height: "middle",
    distance: "middle",
    movement: "moved",
    containerHints: ["jacket pocket", "car compartment"],
    hiddenHints: ["near the route back"],
    behaviorHints: ["unloading routine", "return-home transition"]
  },
  night: {
    directions: ["North", "Northeast"],
    environments: ["resting area", "shadowed corner", "soft surface"],
    colors: ["navy", "silver"],
    height: "low",
    distance: "near",
    movement: "still",
    containerHints: ["bedside drawer", "soft case"],
    hiddenHints: ["under nearby layers", "corner beside furniture"],
    behaviorHints: ["fatigue effect", "rest-state placement", "missed in low attention"]
  }
};

function profileForBucket(bucket: TimeBucket): TimeSymbolKey {
  if (bucket === "early_morning" || bucket === "morning") return "dawn";
  if (bucket === "afternoon") return "day";
  if (bucket === "evening") return "dusk";
  return "night";
}

function chooseSecondaryDirection(
  dateSeed: ReturnType<typeof parseDateSeed>,
  bucket: TimeBucket
): Direction {
  const directions: Direction[] = ["North", "Northeast", "East", "Southeast", "South", "Southwest", "West", "Northwest"];
  return directions[(dateSeed.month + dateSeed.day + timeBucketIndex(bucket)) % directions.length];
}

function uniqueList(values: string[]): string[] {
  return values.filter((value, index) => Boolean(value) && values.indexOf(value) === index);
}

function createReading(context: HeuristicContext): KnowledgeReading {
  const { input, objectProfile, sceneProfile } = context;
  const dateSeed = parseDateSeed(input.date);
  const bucket = resolveTimeBucket(input.time);
  const profileKey = profileForBucket(bucket);
  const profile = TIME_SYMBOLS[profileKey];
  const secondaryDirection = chooseSecondaryDirection(dateSeed, bucket);

  const directions = uniqueList([...profile.directions, secondaryDirection]).slice(0, 3) as Direction[];
  const environments = [...profile.environments];
  const colors = [...profile.colors];
  const containerHints = [...profile.containerHints];
  const hiddenHints = [...profile.hiddenHints];
  const behaviorHints = [...profile.behaviorHints];

  let height = profile.height;
  let distance = profile.distance;
  let movement = profile.movement;
  let confidence = 0.58 + (input.date && input.time ? 0.08 : 0);

  if (sceneProfile.key === "travel" || sceneProfile.key === "hotel") {
    environments.push("travel route", "public handoff");
    containerHints.push("document sleeve", "outer travel pocket");
    hiddenHints.push("seat pocket", "luggage handle area");
    distance = "far";
  }

  if (sceneProfile.key === "bathroom" || sceneProfile.key === "kitchen") {
    environments.push("water-adjacent surface");
    hiddenHints.push("sink edge");
    height = "low";
  }

  if (objectProfile.key === "documents") {
    environments.push("document zone");
    containerHints.push("passport holder", "folder");
    hiddenHints.push("between travel papers");
  }

  if (objectProfile.key === "audio" || objectProfile.key === "phone") {
    environments.push("electronic surface");
    containerHints.push("device pocket");
    hiddenHints.push("beside a cable");
  }

  if (objectProfile.key === "jewelry") {
    environments.push("small personal surface");
    containerHints.push("small dish");
    hiddenHints.push("towel fold");
  }

  if (bucket === "late_night") {
    behaviorHints.push("fatigue");
    confidence += 0.02;
  }

  return {
    method: "directional_symbol",
    resultKey: `${profileKey}_${bucket}`,
    directions,
    environments: uniqueList(environments).slice(0, 6),
    colors: uniqueList(colors).slice(0, 4),
    height,
    distance,
    movement,
    containerHints: uniqueList(containerHints).slice(0, 5),
    hiddenHints: uniqueList(hiddenHints).slice(0, 5),
    behaviorHints: uniqueList(behaviorHints).slice(0, 5),
    confidence: Math.max(0.5, Math.min(0.74, Number(confidence.toFixed(2))))
  };
}

export function astrologyHeuristic(context: HeuristicContext): HeuristicWeights {
  const reading = createReading(context);
  return readingToHeuristicWeights("astrology", reading);
}
