import { Direction, HeuristicWeights, KnowledgeReading } from "@/lib/engine/types";
import { HeuristicContext } from "@/lib/engine/heuristics/types";
import {
  buildDeterministicSeed,
  hasAnyPhrase,
  parseDateSeed,
  readingToHeuristicWeights,
  resolveTimeBucket,
  TimeBucket
} from "@/lib/engine/heuristics/utils";

type LiurenKey = "da_an" | "liu_lian" | "su_xi" | "chi_kou" | "xiao_ji" | "kong_wang";

type LiurenProfile = {
  resultKey: LiurenKey;
  directions: Direction[];
  environments: string[];
  colors: string[];
  height: KnowledgeReading["height"];
  distance: KnowledgeReading["distance"];
  movement: KnowledgeReading["movement"];
  containerHints: string[];
  hiddenHints: string[];
  behaviorHints: string[];
  confidence: number;
};

// V1 rule table for the six internal Liuren outcomes.
// Source intent: digital translation of the PDF's lost-item Liuren workflow.
//
// Mapping notes used here for calibration:
// - 大安 / da_an:
//   direction -> East-led, steady indoor/familiar area
//   environment -> wood, furniture, storage, original room
//   height -> middle
//   distance -> near
//   movement -> still
//   container/hidden -> drawer, bag pocket, beside furniture
// - 留连 / liu_lian:
//   direction -> North/West leaning, delayed recovery
//   environment -> hidden corner, fabric, low surface
//   height -> low
//   distance -> middle
//   movement -> uncertain
//   container/hidden -> coat pocket, drawer edge, under folds
// - 速喜 / su_xi:
//   direction -> South/East leaning, visible or bright area
//   environment -> bright surface, charging zone, entry surface
//   height -> high
//   distance -> near
//   movement -> still
//   container/hidden -> open tray, small open compartment, beside charger
// - 赤口 / chi_kou:
//   direction -> West/Northwest leaning, public/contact route
//   environment -> public surface, vehicle, exit path
//   height -> middle
//   distance -> far
//   movement -> moved
//   container/hidden -> jacket pocket, car console, seat gap
// - 小吉 / xiao_ji:
//   direction -> Southeast/East leaning, recoverable nearby
//   environment -> container area, familiar route, private indoor space
//   height -> middle
//   distance -> near
//   movement -> still
//   container/hidden -> bag pocket, hoodie pocket, nightstand drawer
// - 空亡 / kong_wang:
//   direction -> Northwest/West/North leaning, widened route search
//   environment -> travel path, emptier surface, edge of search area
//   height -> low
//   distance -> far
//   movement -> moved
//   container/hidden -> luggage pocket, outer compartment, under seat
const LIUREN_PROFILES: LiurenProfile[] = [
  {
    resultKey: "da_an",
    directions: ["East", "Southwest", "Northeast"],
    environments: ["familiar indoor space", "wood or furniture", "storage area"],
    colors: ["green", "earth yellow"],
    height: "middle",
    distance: "near",
    movement: "still",
    containerHints: ["drawer", "bag pocket", "near daily belongings"],
    hiddenHints: ["beside furniture", "under a nearby object"],
    behaviorHints: ["original area", "routine placement", "calm second pass"],
    confidence: 0.78
  },
  {
    resultKey: "liu_lian",
    directions: ["North", "West", "Northeast"],
    environments: ["hidden corner", "fabric area", "low surface"],
    colors: ["charcoal", "deep blue"],
    height: "low",
    distance: "middle",
    movement: "uncertain",
    containerHints: ["coat pocket", "drawer edge"],
    hiddenHints: ["under fabric", "behind nearby items", "folded area"],
    behaviorHints: ["overlooked on the first pass", "delayed recovery", "visual blind spot"],
    confidence: 0.7
  },
  {
    resultKey: "su_xi",
    directions: ["South", "East", "Southeast"],
    environments: ["bright surface", "charging area", "entry surface"],
    colors: ["gold", "red"],
    height: "high",
    distance: "near",
    movement: "still",
    containerHints: ["open tray", "small bag compartment"],
    hiddenHints: ["visible clutter edge", "beside charger"],
    behaviorHints: ["quick set-down", "short interruption", "easy to recover nearby"],
    confidence: 0.74
  },
  {
    resultKey: "chi_kou",
    directions: ["West", "Northwest", "South"],
    environments: ["public contact area", "vehicle area", "exit route"],
    colors: ["white", "red"],
    height: "middle",
    distance: "far",
    movement: "moved",
    containerHints: ["jacket pocket", "car console", "counter tray"],
    hiddenHints: ["seat gap", "counter edge", "near shared surface"],
    behaviorHints: ["attention split", "contact with other people", "transition between places"],
    confidence: 0.68
  },
  {
    resultKey: "xiao_ji",
    directions: ["Southeast", "East", "North"],
    environments: ["container area", "familiar route", "private indoor space"],
    colors: ["teal", "soft green"],
    height: "middle",
    distance: "near",
    movement: "still",
    containerHints: ["bag pocket", "hoodie pocket", "nightstand drawer"],
    hiddenHints: ["under paper", "inside clothing folds"],
    behaviorHints: ["recoverable nearby", "short route shift", "check carry layers"],
    confidence: 0.76
  },
  {
    resultKey: "kong_wang",
    directions: ["Northwest", "West", "North"],
    environments: ["travel path", "empty surface", "wider search area"],
    colors: ["gray", "black"],
    height: "low",
    distance: "far",
    movement: "moved",
    containerHints: ["luggage pocket", "door pocket", "outer compartment"],
    hiddenHints: ["under seat", "behind larger items", "floor edge"],
    behaviorHints: ["displaced during transition", "widen search calmly", "check the last route out"],
    confidence: 0.64
  }
];

const TIME_OFFSETS: Record<TimeBucket, number> = {
  early_morning: 0,
  morning: 1,
  afternoon: 2,
  evening: 3,
  night: 4,
  late_night: 5
};

function uniqueList(values: string[]): string[] {
  return values.filter((value, index) => Boolean(value) && values.indexOf(value) === index);
}

function createReading(context: HeuristicContext): KnowledgeReading {
  const { input, objectProfile, sceneProfile } = context;
  const story = input.story.toLowerCase();
  const dateSeed = parseDateSeed(input.date);
  const bucket = resolveTimeBucket(input.time);
  const seed = buildDeterministicSeed(input);
  const profile = LIUREN_PROFILES[(dateSeed.total + TIME_OFFSETS[bucket] + seed) % LIUREN_PROFILES.length];

  const environments = [...profile.environments];
  const colors = [...profile.colors];
  const containerHints = [...profile.containerHints];
  const hiddenHints = [...profile.hiddenHints];
  const behaviorHints = [...profile.behaviorHints];
  const directions = [...profile.directions];

  let height = profile.height;
  let distance = profile.distance;
  let movement = profile.movement;
  let confidence = profile.confidence;

  if (objectProfile.key === "documents") {
    environments.push("document storage", "desk papers");
    containerHints.push("document sleeve", "passport holder");
    hiddenHints.push("inside paper stack");
    colors.push("navy");
    confidence += 0.03;
  }

  if (objectProfile.key === "jewelry") {
    environments.push("water edge", "small personal surface");
    containerHints.push("small dish", "drawer lip");
    hiddenHints.push("towel folds", "near the drain edge");
    colors.push("silver");
  }

  if (objectProfile.key === "audio" || objectProfile.key === "phone") {
    environments.push("electronics area", "charging surface");
    containerHints.push("hoodie pocket", "bag sleeve");
    hiddenHints.push("between cushions", "near cable");
    colors.push("black");
  }

  if (sceneProfile.key === "bathroom" || sceneProfile.key === "kitchen" || hasAnyPhrase(story, ["sink", "shower", "washing"])) {
    environments.push("water area");
    hiddenHints.push("behind toiletries", "sink edge");
    distance = "near";
    height = height === "high" ? "middle" : height;
  }

  if (sceneProfile.key === "car" || sceneProfile.key === "travel" || hasAnyPhrase(story, ["driving", "taxi", "rideshare", "airport", "checkout"])) {
    environments.push("movement route");
    containerHints.push("seat pocket", "center console");
    hiddenHints.push("seat gap", "floor mat");
    movement = "moved";
    distance = "far";
  }

  if (sceneProfile.key === "bedroom" || sceneProfile.key === "home" || sceneProfile.key === "living_room") {
    environments.push("familiar indoor space");
    containerHints.push("drawer", "near daily belongings");
    hiddenHints.push("under fabric layers");
  }

  if (!input.date || !input.time) {
    confidence -= 0.06;
  }

  return {
    method: "liuren",
    resultKey: profile.resultKey,
    directions,
    environments: uniqueList(environments).slice(0, 6),
    colors: uniqueList(colors).slice(0, 4),
    height,
    distance,
    movement,
    containerHints: uniqueList(containerHints).slice(0, 5),
    hiddenHints: uniqueList(hiddenHints).slice(0, 5),
    behaviorHints: uniqueList(behaviorHints).slice(0, 5),
    confidence: Math.max(0.5, Math.min(0.84, Number(confidence.toFixed(2))))
  };
}

export function liurenHeuristic(context: HeuristicContext): HeuristicWeights {
  const reading = createReading(context);
  return readingToHeuristicWeights("liuren", reading);
}
