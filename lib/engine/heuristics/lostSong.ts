import { Direction, HeuristicWeights, KnowledgeReading } from "@/lib/engine/types";
import { HeuristicContext } from "@/lib/engine/heuristics/types";
import { buildDeterministicSeed, hasAnyPhrase, readingToHeuristicWeights } from "@/lib/engine/heuristics/utils";

type TrigramKey = "zhen" | "li" | "kun" | "qian" | "kan" | "xun" | "dui" | "gen";

type LostSongProfile = {
  resultKey: string;
  direction: Direction;
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

// V1 rule table for the internal Lost Song / Xunwu Jue mapping.
// Source intent: digital translation of the PDF's stem-to-trigram lost-item rules.
//
// Stem mapping implemented here:
// - 甲 -> 震 / East
// - 乙 -> 离 / South
// - 丙辛 -> 坤 / Southwest
// - 丁 -> 乾 / Northwest
// - 戊 -> 坎 / North
// - 己 -> 巽 / Southeast
// - 庚 -> 兑 / West
// - 壬癸 -> 艮 / Northeast
//
// Trigram image notes used for V1 calibration:
// - 震 / zhen:
//   direction -> East
//   class image -> wood, doorway, movement path
//   height/distance/movement -> middle / near / moved
// - 离 / li:
//   direction -> South
//   class image -> light, fire, visible shelf, electronics
//   height/distance/movement -> high / near / still
// - 坤 / kun:
//   direction -> Southwest
//   class image -> earth, fabric, covered layer, ground storage
//   height/distance/movement -> low / near / still
// - 乾 / qian:
//   direction -> Northwest
//   class image -> metal, vehicle, hard case, outer compartment
//   height/distance/movement -> high / middle / moved
// - 坎 / kan:
//   direction -> North
//   class image -> water, drain, shadowed wet surface
//   height/distance/movement -> low / middle / uncertain
// - 巽 / xun:
//   direction -> Southeast
//   class image -> clothing, bag zone, folds, corner space
//   height/distance/movement -> middle / near / moved
// - 兑 / dui:
//   direction -> West
//   class image -> open surface, small holder, payment edge, metal
//   height/distance/movement -> middle / middle / still
// - 艮 / gen:
//   direction -> Northeast
//   class image -> corner, shelf edge, blocked or stacked area
//   height/distance/movement -> middle / near / still
const STEM_SEQUENCE: Array<{ key: string; trigram: TrigramKey }> = [
  { key: "jia_zhen", trigram: "zhen" },
  { key: "yi_li", trigram: "li" },
  { key: "bing_xin_kun", trigram: "kun" },
  { key: "ding_qian", trigram: "qian" },
  { key: "wu_kan", trigram: "kan" },
  { key: "ji_xun", trigram: "xun" },
  { key: "geng_dui", trigram: "dui" },
  { key: "ren_gui_gen", trigram: "gen" }
];

const TRIGRAM_PROFILES: Record<TrigramKey, Omit<LostSongProfile, "resultKey">> = {
  zhen: {
    direction: "East",
    environments: ["wood or furniture", "entry path", "active route"],
    colors: ["green"],
    height: "middle",
    distance: "near",
    movement: "moved",
    containerHints: ["door-side container", "bag opening"],
    hiddenHints: ["near doorway items"],
    behaviorHints: ["movement between tasks", "set down during motion"],
    confidence: 0.72
  },
  li: {
    direction: "South",
    environments: ["lighted surface", "electronics area", "visible shelf"],
    colors: ["red", "amber"],
    height: "high",
    distance: "near",
    movement: "still",
    containerHints: ["charging tray", "desk organizer"],
    hiddenHints: ["beside a lamp", "near a charger"],
    behaviorHints: ["visible set-down", "short interruption"],
    confidence: 0.74
  },
  kun: {
    direction: "Southwest",
    environments: ["fabric area", "ground-level storage", "covered surface"],
    colors: ["beige", "yellow"],
    height: "low",
    distance: "near",
    movement: "still",
    containerHints: ["laundry basket", "drawer", "bag pocket"],
    hiddenHints: ["under soft layers", "near floor edge"],
    behaviorHints: ["covered by routine items", "rests in familiar storage"],
    confidence: 0.76
  },
  qian: {
    direction: "Northwest",
    environments: ["metal area", "vehicle zone", "box-like storage"],
    colors: ["white", "silver"],
    height: "high",
    distance: "middle",
    movement: "moved",
    containerHints: ["car compartment", "hard case", "outer pocket"],
    hiddenHints: ["beside seat edge", "near luggage"],
    behaviorHints: ["moved with travel", "carried between locations"],
    confidence: 0.68
  },
  kan: {
    direction: "North",
    environments: ["water edge", "shadowed area", "drain-side surface"],
    colors: ["black", "blue"],
    height: "low",
    distance: "middle",
    movement: "uncertain",
    containerHints: ["toiletry bag", "small dish"],
    hiddenHints: ["near drain edge", "behind wet items"],
    behaviorHints: ["removed near water", "easy to overlook after washing"],
    confidence: 0.73
  },
  xun: {
    direction: "Southeast",
    environments: ["clothing area", "bag zone", "corner space"],
    colors: ["teal", "green"],
    height: "middle",
    distance: "near",
    movement: "moved",
    containerHints: ["hoodie pocket", "soft bag compartment"],
    hiddenHints: ["inside folds", "corner near clothing"],
    behaviorHints: ["carried with soft layers", "moved with clothing"],
    confidence: 0.71
  },
  dui: {
    direction: "West",
    environments: ["open surface", "small holder", "metal nearby"],
    colors: ["white", "gold"],
    height: "middle",
    distance: "middle",
    movement: "still",
    containerHints: ["card holder", "small tray"],
    hiddenHints: ["under paper edge", "beside payment surface"],
    behaviorHints: ["left near checkout", "resting on a small surface"],
    confidence: 0.69
  },
  gen: {
    direction: "Northeast",
    environments: ["corner area", "shelf edge", "blocked surface"],
    colors: ["brown", "cream"],
    height: "middle",
    distance: "near",
    movement: "still",
    containerHints: ["shelf basket", "document sleeve"],
    hiddenHints: ["behind stacked items", "near a corner"],
    behaviorHints: ["still in place but blocked from view", "needs a slower second pass"],
    confidence: 0.75
  }
};

function uniqueList(values: string[]): string[] {
  return values.filter((value, index) => Boolean(value) && values.indexOf(value) === index);
}

function createReading(context: HeuristicContext): KnowledgeReading {
  const { input, objectProfile, sceneProfile } = context;
  const story = input.story.toLowerCase();
  const seed = buildDeterministicSeed(input);
  const sequence = STEM_SEQUENCE[seed % STEM_SEQUENCE.length];
  const profile = TRIGRAM_PROFILES[sequence.trigram];

  const directions: Direction[] = [profile.direction];
  const environments = [...profile.environments];
  const colors = [...profile.colors];
  const containerHints = [...profile.containerHints];
  const hiddenHints = [...profile.hiddenHints];
  const behaviorHints = [...profile.behaviorHints];

  let height = profile.height;
  let distance = profile.distance;
  let movement = profile.movement;
  let confidence = profile.confidence;

  if (objectProfile.key === "documents") {
    environments.push("document stack", "travel papers");
    containerHints.push("document sleeve", "passport holder");
    hiddenHints.push("inside folder stack");
    directions.push("Northeast");
    confidence += 0.03;
  }

  if (objectProfile.key === "jewelry") {
    environments.push("small personal surface");
    containerHints.push("small dish", "drawer lip");
    hiddenHints.push("towel fold", "counter edge");
    directions.push("North");
  }

  if (objectProfile.key === "wallet" || /credit card/i.test(input.item)) {
    environments.push("payment area");
    containerHints.push("card holder", "bag pocket");
    hiddenHints.push("inside receipt stack");
    directions.push("West");
  }

  if (objectProfile.key === "audio" || objectProfile.key === "phone") {
    environments.push("electronics surface");
    containerHints.push("charging area", "bag sleeve");
    hiddenHints.push("between cushions", "under a bench edge");
    directions.push("South");
  }

  if (sceneProfile.key === "hotel" || sceneProfile.key === "travel") {
    environments.push("travel path");
    containerHints.push("luggage pocket", "seat pocket");
    hiddenHints.push("inside suitcase lining");
    distance = "far";
    movement = "moved";
  }

  if (sceneProfile.key === "bathroom" || hasAnyPhrase(story, ["sink", "shower", "washing"])) {
    environments.push("water edge");
    hiddenHints.push("near drain edge");
    directions.push("North");
    height = "low";
  }

  if (sceneProfile.key === "bedroom" || sceneProfile.key === "living_room") {
    environments.push("soft resting area");
    hiddenHints.push("under fabric");
    containerHints.push("near personal belongings");
    distance = "near";
  }

  return {
    method: "lost_song",
    resultKey: sequence.key,
    directions: uniqueList(directions).slice(0, 3) as Direction[],
    environments: uniqueList(environments).slice(0, 6),
    colors: uniqueList(colors).slice(0, 4),
    height,
    distance,
    movement,
    containerHints: uniqueList(containerHints).slice(0, 5),
    hiddenHints: uniqueList(hiddenHints).slice(0, 5),
    behaviorHints: uniqueList(behaviorHints).slice(0, 5),
    confidence: Math.max(0.52, Math.min(0.82, Number(confidence.toFixed(2))))
  };
}

export function lostSongHeuristic(context: HeuristicContext): HeuristicWeights {
  const reading = createReading(context);
  return readingToHeuristicWeights("lostSong", reading);
}
