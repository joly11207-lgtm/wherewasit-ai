import { Direction, HeuristicWeights, KnowledgeReading } from "@/lib/engine/types";
import { HeuristicContext } from "@/lib/engine/heuristics/types";
import { buildDeterministicSeed, hasAnyPhrase, readingToHeuristicWeights } from "@/lib/engine/heuristics/utils";

type SymbolKey =
  | "hidden"
  | "covered"
  | "container"
  | "document"
  | "water"
  | "electronics"
  | "clothing"
  | "public_contact"
  | "transition"
  | "overlooked_surface";

type SymbolProfile = {
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

const SYMBOL_PROFILES: Record<SymbolKey, SymbolProfile> = {
  hidden: {
    directions: ["Northeast", "North"],
    environments: ["hidden corner", "blocked surface"],
    colors: ["gray"],
    height: "low",
    distance: "near",
    movement: "still",
    containerHints: ["inside nearby storage"],
    hiddenHints: ["behind an object", "under a nearby layer"],
    behaviorHints: ["missed on the first pass", "blocked from view"]
  },
  covered: {
    directions: ["Southwest", "Northeast"],
    environments: ["covered surface", "fabric area"],
    colors: ["cream"],
    height: "low",
    distance: "near",
    movement: "still",
    containerHints: ["soft container"],
    hiddenHints: ["under fabric", "under paper"],
    behaviorHints: ["covered during routine activity", "needs a careful lift-and-check"]
  },
  container: {
    directions: ["Southeast", "East"],
    environments: ["storage area", "carry layer"],
    colors: ["brown"],
    height: "middle",
    distance: "near",
    movement: "still",
    containerHints: ["bag pocket", "drawer", "holder"],
    hiddenHints: ["inside a lining"],
    behaviorHints: ["placed into the next container used", "stayed with personal belongings"]
  },
  document: {
    directions: ["North", "Northeast"],
    environments: ["paper stack", "document area"],
    colors: ["navy"],
    height: "middle",
    distance: "middle",
    movement: "uncertain",
    containerHints: ["document sleeve", "folder"],
    hiddenHints: ["between papers"],
    behaviorHints: ["blended into paper layers", "flattened under documents"]
  },
  water: {
    directions: ["North", "Northwest"],
    environments: ["water edge", "wet area"],
    colors: ["blue"],
    height: "low",
    distance: "near",
    movement: "uncertain",
    containerHints: ["toiletry bag", "small dish"],
    hiddenHints: ["near drain edge", "behind wet items"],
    behaviorHints: ["removed during washing", "overlooked after water use"]
  },
  electronics: {
    directions: ["South", "East"],
    environments: ["charging area", "electronic surface"],
    colors: ["black"],
    height: "high",
    distance: "near",
    movement: "still",
    containerHints: ["desk organizer", "device pocket"],
    hiddenHints: ["near a charger"],
    behaviorHints: ["left near another device", "set beside a cable or outlet"]
  },
  clothing: {
    directions: ["Southeast", "Southwest"],
    environments: ["fabric area", "clothing layer"],
    colors: ["olive"],
    height: "middle",
    distance: "near",
    movement: "moved",
    containerHints: ["coat pocket", "hoodie pocket", "laundry basket"],
    hiddenHints: ["inside folds", "under clothing"],
    behaviorHints: ["moved with soft layers", "carried with clothing or towels"]
  },
  public_contact: {
    directions: ["West", "Northwest"],
    environments: ["shared surface", "public path"],
    colors: ["white"],
    height: "middle",
    distance: "far",
    movement: "moved",
    containerHints: ["counter tray", "outer pocket"],
    hiddenHints: ["near a shared edge"],
    behaviorHints: ["attention shifted around other people", "left on a public surface"]
  },
  transition: {
    directions: ["East", "West"],
    environments: ["transition path", "handoff surface"],
    colors: ["amber"],
    height: "middle",
    distance: "far",
    movement: "moved",
    containerHints: ["temporary carry pocket"],
    hiddenHints: ["near the path out"],
    behaviorHints: ["lost during a route change", "task switching moment"]
  },
  overlooked_surface: {
    directions: ["South", "East"],
    environments: ["visible surface", "resting ledge"],
    colors: ["gold"],
    height: "high",
    distance: "near",
    movement: "still",
    containerHints: ["open tray"],
    hiddenHints: ["beside visible clutter"],
    behaviorHints: ["plain sight but mentally filtered out", "set down without marking it"]
  }
};

function uniqueList(values: string[]): string[] {
  return values.filter((value, index) => Boolean(value) && values.indexOf(value) === index);
}

function chooseSymbols(context: HeuristicContext): SymbolKey[] {
  const { input, objectProfile, sceneProfile } = context;
  const story = input.story.toLowerCase();
  const symbols: SymbolKey[] = [];

  if (sceneProfile.profile.hiddenAreas.length > 0 || hasAnyPhrase(story, ["under", "behind", "between"])) {
    symbols.push("hidden");
  }
  if (hasAnyPhrase(story, ["blanket", "towel", "menu", "paper", "napkin"])) {
    symbols.push("covered");
  }
  if (hasAnyPhrase(story, ["bag", "drawer", "holder", "pocket", "case", "sleeve"])) {
    symbols.push("container");
  }
  if (objectProfile.key === "documents") {
    symbols.push("document");
  }
  if (sceneProfile.key === "bathroom" || sceneProfile.key === "kitchen" || hasAnyPhrase(story, ["sink", "shower", "washing"])) {
    symbols.push("water");
  }
  if (objectProfile.key === "audio" || objectProfile.key === "phone" || hasAnyPhrase(story, ["charging", "device", "desk"])) {
    symbols.push("electronics");
  }
  if (hasAnyPhrase(story, ["hoodie", "coat", "jacket", "clothes", "laundry", "towel"])) {
    symbols.push("clothing");
  }
  if (hasAnyPhrase(story, ["restaurant", "cafe", "airport", "hotel lobby", "taxi", "meeting", "checkout"])) {
    symbols.push("public_contact");
  }
  if (hasAnyPhrase(story, ["packing", "boarding", "leaving", "moving", "switching", "meeting"])) {
    symbols.push("transition");
  }
  if (hasAnyPhrase(story, ["table", "desk", "counter", "nightstand", "visible", "set down"])) {
    symbols.push("overlooked_surface");
  }

  const unique = uniqueList(symbols);
  if (unique.length >= 2) {
    return unique.slice(0, 2) as SymbolKey[];
  }

  const keys = Object.keys(SYMBOL_PROFILES) as SymbolKey[];
  const seed = buildDeterministicSeed(input);
  unique.push(keys[seed % keys.length]);
  if (unique.length < 2) {
    unique.push(keys[(seed + 3) % keys.length]);
  }

  return uniqueList(unique).slice(0, 2) as SymbolKey[];
}

function chooseHeight(values: KnowledgeReading["height"][]): KnowledgeReading["height"] {
  if (values.includes("low")) return "low";
  if (values.includes("high")) return "high";
  if (values.includes("middle")) return "middle";
  return "unknown";
}

function chooseDistance(values: KnowledgeReading["distance"][]): KnowledgeReading["distance"] {
  if (values.includes("near")) return "near";
  if (values.includes("middle")) return "middle";
  if (values.includes("far")) return "far";
  return "unknown";
}

function chooseMovement(values: KnowledgeReading["movement"][]): KnowledgeReading["movement"] {
  if (values.includes("moved")) return "moved";
  if (values.includes("still")) return "still";
  if (values.includes("uncertain")) return "uncertain";
  return "uncertain";
}

function createReading(context: HeuristicContext): KnowledgeReading {
  const selected = chooseSymbols(context);
  const profiles = selected.map((key) => SYMBOL_PROFILES[key]);

  const directions = uniqueList(profiles.flatMap((profile) => profile.directions)).slice(0, 3) as Direction[];
  const environments = uniqueList(profiles.flatMap((profile) => profile.environments)).slice(0, 6);
  const colors = uniqueList(profiles.flatMap((profile) => profile.colors)).slice(0, 4);
  const containerHints = uniqueList(profiles.flatMap((profile) => profile.containerHints)).slice(0, 5);
  const hiddenHints = uniqueList(profiles.flatMap((profile) => profile.hiddenHints)).slice(0, 5);
  const behaviorHints = uniqueList(profiles.flatMap((profile) => profile.behaviorHints)).slice(0, 5);

  return {
    method: "symbolic_tarot",
    resultKey: selected.join("+"),
    directions,
    environments,
    colors,
    height: chooseHeight(profiles.map((profile) => profile.height)),
    distance: chooseDistance(profiles.map((profile) => profile.distance)),
    movement: chooseMovement(profiles.map((profile) => profile.movement)),
    containerHints,
    hiddenHints,
    behaviorHints,
    confidence: 0.62
  };
}

export function tarotHeuristic(context: HeuristicContext): HeuristicWeights {
  const reading = createReading(context);
  return readingToHeuristicWeights("tarot", reading);
}
