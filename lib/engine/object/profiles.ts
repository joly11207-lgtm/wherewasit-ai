import { ObjectProfile } from "@/lib/engine/types";

export const OBJECT_PROFILES: Record<string, ObjectProfile> = {
  keys: {
    label: "Keys",
    physicalTraits: ["small", "hard", "metal", "easy to slide off a surface"],
    commonBehaviors: ["lands near entry routines", "stays in pockets", "drops into seat gaps"],
    likelyContainers: ["jacket pockets", "pants pockets", "center console", "cup holder", "door pocket"],
    riskZones: ["entryway surfaces", "car seat gaps", "floor mat", "center console", "counter edges"],
    searchHints: ["check threshold surfaces", "check pockets before open areas", "check the car control area before open rooms"]
  },
  wallet: {
    label: "Wallet",
    physicalTraits: ["flat", "compact", "easy to stack under paper or receipts"],
    commonBehaviors: ["stays with the last carry spot", "gets unloaded with errands", "slides under paper stacks"],
    likelyContainers: ["jacket pockets", "bag pocket", "card holder", "receipt stack", "car console"],
    riskZones: ["payment terminal", "checkout counters", "kitchen counters", "car seats", "entry tables"],
    searchHints: ["check wherever receipts landed", "check unloading surfaces", "check the last payment or carry surface"]
  },
  phone: {
    label: "Phone",
    physicalTraits: ["flat", "smooth", "easy to set down without noticing"],
    commonBehaviors: ["sinks into soft surfaces", "lands on flat ledges", "moves with multitasking"],
    likelyContainers: ["bag sleeves", "jacket pockets", "car console", "bedside surfaces", "seat pocket"],
    riskZones: ["couch cushions", "bedside tables", "bathroom counters", "car seats", "charging areas"],
    searchHints: ["check soft surfaces first", "check flat ledges near charging", "check the nearest carry spot after movement"]
  },
  audio: {
    label: "AirPods / Earbuds",
    physicalTraits: ["small", "rounded", "lightweight", "easy to roll"],
    commonBehaviors: ["falls into gaps", "gets left near electronics", "stays inside bags or pockets"],
    likelyContainers: ["bag pockets", "jacket pockets", "charging areas", "desk organizers", "remote basket"],
    riskZones: ["bench gaps", "floor edges", "car seat gaps", "between cushions", "under towels"],
    searchHints: ["check low gaps", "check near chargers", "check inside soft containers and blanket folds"]
  },
  jewelry: {
    label: "Ring / Jewelry",
    physicalTraits: ["small", "slick", "easy to catch in fabric", "easy to set by water"],
    commonBehaviors: ["comes off during washing", "travels with towels or laundry", "rests on small ledges"],
    likelyContainers: ["jewelry trays", "laundry baskets", "small dishes", "drawer lip", "hoodie pocket", "pockets"],
    riskZones: ["sink edges", "drain area", "bathroom counters", "laundry baskets", "counter edges", "dresser tops"],
    searchHints: ["check washing areas first", "check towel folds", "check sink and counter edges before large open rooms"]
  },
  documents: {
    label: "Passport / Documents",
    physicalTraits: ["flat", "stackable", "easy to hide inside another layer"],
    commonBehaviors: ["slides into folders", "gets packed into travel layers", "blends into paper piles"],
    likelyContainers: ["document sleeves", "passport holder", "travel bags", "backpack pocket", "desk drawers", "jackets"],
    riskZones: ["airport security tray", "desks", "printer areas", "packing surfaces", "entryway staging spots"],
    searchHints: ["flatten paper stacks", "check sleeves inside larger bags", "search travel prep areas before open rooms"]
  },
  glasses: {
    label: "Glasses",
    physicalTraits: ["light", "fragile", "easy to rest on soft surfaces"],
    commonBehaviors: ["gets removed in rest spots", "slides into blankets", "stays near lamps or books"],
    likelyContainers: ["soft cases", "bag pockets", "coat pockets", "bedside tables", "dresser corners"],
    riskZones: ["table surfaces", "under menus", "chair gaps", "couch cushions", "bedside surfaces"],
    searchHints: ["search at sitting height", "check table surfaces and nearby paper stacks", "check the last place you settled down"]
  },
  bag: {
    label: "Bag / Backpack",
    physicalTraits: ["large", "soft-sided", "easy to lean against furniture"],
    commonBehaviors: ["stops at the first drop zone", "stays in the car during unloading", "gets hidden behind chairs"],
    likelyContainers: ["backpack pocket", "entry chairs", "car back seat", "hooks", "office chair backs", "suitcase side pocket"],
    riskZones: ["airport security tray", "entryway floors", "trunk corners", "chair backs", "bedroom floors", "luggage area"],
    searchHints: ["replay the unload path", "check behind furniture", "check the car before assuming it came inside"]
  },
  camera: {
    label: "Camera",
    physicalTraits: ["compact", "valuable", "often carried in a dedicated case"],
    commonBehaviors: ["stays near a camera bag", "gets set down during unloading", "slides into seat or trunk gaps"],
    likelyContainers: ["camera bag", "back seat pocket", "trunk side pocket", "jacket pocket"],
    riskZones: ["center console", "seat gap", "floor mat", "trunk floor", "back seat"],
    searchHints: ["check the camera bag first", "check unloading zones inside the car", "check low gaps before open surfaces"]
  },
  other: {
    label: "Other",
    physicalTraits: ["portable", "routine-dependent"],
    commonBehaviors: ["gets set down during transitions", "ends up in the next container used"],
    likelyContainers: ["bag pockets", "jacket pockets", "side tables", "desks"],
    riskZones: ["transition surfaces", "soft containers", "nearby furniture edges", "car surfaces"],
    searchHints: ["search the last routine break", "check containers before open space", "follow the first movement after last use"]
  }
};
