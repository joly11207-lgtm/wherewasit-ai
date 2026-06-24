import { BehaviorPattern, ExtractedInput, ItemCategory } from "@/lib/types";

function hasAny(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => text.includes(phrase));
}

export function resolveItemCategory(itemType: string): ItemCategory {
  const normalized = itemType.toLowerCase();

  if (hasAny(normalized, ["key", "keys"])) return "keys";
  if (hasAny(normalized, ["wallet", "cardholder"])) return "wallet";
  if (hasAny(normalized, ["airpods", "earbuds", "earbud", "headphones"])) return "audio";
  if (hasAny(normalized, ["ring", "jewelry", "necklace", "bracelet", "earring"])) return "jewelry";
  if (hasAny(normalized, ["phone", "iphone", "android", "mobile", "remote"])) return "phone";
  if (hasAny(normalized, ["passport", "document", "documents", "folder", "paper"])) {
    return "documents";
  }
  if (hasAny(normalized, ["glasses", "sunglasses", "spectacles"])) return "glasses";
  if (hasAny(normalized, ["backpack", "bag", "purse", "tote", "briefcase"])) return "bag";

  return "general";
}

const ITEM_PATTERNS: Record<ItemCategory, BehaviorPattern[]> = {
  keys: [
    {
      itemCategory: "keys",
      location: "Entryway drop zone",
      weight: 9,
      reason: "Keys usually come off the moment you cross a threshold or free a hand.",
      hiddenSpots: ["Shoe shelf", "Console edge", "Inside yesterday's bag"],
      tags: ["threshold", "wood", "familiar"]
    },
    {
      itemCategory: "keys",
      location: "Jacket, pants, or bag pocket",
      weight: 8,
      reason: "Keys often stay in the first pocket or bag compartment used during a rushed transition.",
      hiddenSpots: ["Pocket corners", "Bag organizer seam", "Inside a folded tote"],
      tags: ["enclosed", "fabric"]
    },
    {
      itemCategory: "keys",
      location: "Car seat, console, and floor gap",
      weight: 8,
      reason: "Keys slip from a hand or lap during driving and parking transitions.",
      hiddenSpots: ["Between seat and console", "Cup holder edge", "Door pocket"],
      tags: ["car", "transition", "enclosed"]
    }
  ],
  wallet: [
    {
      itemCategory: "wallet",
      location: "Pants pocket, jacket pocket, or everyday bag",
      weight: 9,
      reason: "Wallets usually stay with the travel container they were last pulled from.",
      hiddenSpots: ["Rear pocket lining", "Bag sleeve", "Jacket inner pocket"],
      tags: ["enclosed", "fabric"]
    },
    {
      itemCategory: "wallet",
      location: "Car seat, console, and grocery bag area",
      weight: 8,
      reason: "After errands, wallets get set down near receipts, bags, and cup holders.",
      hiddenSpots: ["Seat gap", "Center console", "Reusable bag pocket"],
      tags: ["car", "transition", "enclosed"]
    },
    {
      itemCategory: "wallet",
      location: "Kitchen counter or entry table",
      weight: 7,
      reason: "People often unload a wallet with keys, mail, or shopping items at home.",
      hiddenSpots: ["Under mail", "Beside grocery receipts", "Near the fruit bowl"],
      tags: ["wood", "familiar", "covered"]
    }
  ],
  audio: [
    {
      itemCategory: "audio",
      location: "Bedside surface or charging area",
      weight: 9,
      reason: "Small audio items often come off near bedtime, charging, or getting dressed.",
      hiddenSpots: ["Inside blankets", "Under the bed edge", "Near charging cables"],
      tags: ["fabric", "covered", "familiar"]
    },
    {
      itemCategory: "audio",
      location: "Jacket, hoodie, or bag pocket",
      weight: 8,
      reason: "Earbuds are easy to tuck away quickly without leaving a strong memory trace.",
      hiddenSpots: ["Small inner pocket", "Bag zipper corner", "Hoodie pouch"],
      tags: ["enclosed", "fabric", "transition"]
    },
    {
      itemCategory: "audio",
      location: "Car seat, console, and office desk edge",
      weight: 7,
      reason: "Earbuds often move through the commute and surface again while sitting down to work.",
      hiddenSpots: ["Seat rail", "Cup holder", "Under a monitor stand"],
      tags: ["car", "work", "transition"]
    }
  ],
  jewelry: [
    {
      itemCategory: "jewelry",
      location: "Bathroom sink, vanity, or soap area",
      weight: 9,
      reason: "Jewelry often comes off during washing, lotion, or shower routines.",
      hiddenSpots: ["Beside the faucet", "Inside a small dish", "Near hand towel folds"],
      tags: ["water", "familiar", "covered"]
    },
    {
      itemCategory: "jewelry",
      location: "Bedroom nightstand, dresser, or jewelry tray",
      weight: 8,
      reason: "Rings and jewelry are commonly set down in familiar indoor spaces before sleep or changing clothes.",
      hiddenSpots: ["Behind the nightstand", "Inside a drawer lip", "Under folded clothing"],
      tags: ["wood", "fabric", "familiar"]
    },
    {
      itemCategory: "jewelry",
      location: "Laundry area, hamper, or clothing pocket",
      weight: 7,
      reason: "Jewelry can catch on fabric and travel into laundry or clothing piles.",
      hiddenSpots: ["Hamper corner", "Inside a sleeve", "Laundry basket liner"],
      tags: ["laundry", "fabric", "enclosed"]
    }
  ],
  phone: [
    {
      itemCategory: "phone",
      location: "Couch, bed, or soft seating area",
      weight: 9,
      reason: "Phones vanish into cushions, blankets, and soft surfaces faster than memory expects.",
      hiddenSpots: ["Couch crease", "Bed sheets", "Under a throw blanket"],
      tags: ["fabric", "covered", "familiar"]
    },
    {
      itemCategory: "phone",
      location: "Desk, kitchen counter, or bathroom ledge",
      weight: 8,
      reason: "Phones often get set down on the nearest flat surface during multitasking.",
      hiddenSpots: ["Under papers", "Beside a charger", "Near toiletries"],
      tags: ["wood", "water", "familiar"]
    },
    {
      itemCategory: "phone",
      location: "Car seat, bag, or jacket pocket",
      weight: 8,
      reason: "Phones shift between hand, lap, pocket, and bag during travel.",
      hiddenSpots: ["Door pocket", "Bag sleeve", "Jacket lining"],
      tags: ["car", "enclosed", "transition"]
    }
  ],
  documents: [
    {
      itemCategory: "documents",
      location: "Travel bag, folder, or document sleeve",
      weight: 9,
      reason: "Important papers are usually placed inside a protective container before travel.",
      hiddenSpots: ["Laptop sleeve", "Front zip pocket", "Folder inside a larger bag"],
      tags: ["enclosed", "travel", "familiar"]
    },
    {
      itemCategory: "documents",
      location: "Desk, printer area, or pile of papers",
      weight: 8,
      reason: "Passports and documents often disappear into flat stacks and work surfaces.",
      hiddenSpots: ["Under other papers", "Inside a notebook", "Beside the printer tray"],
      tags: ["work", "covered", "wood"]
    },
    {
      itemCategory: "documents",
      location: "Entry table, suitcase top, or check-in prep area",
      weight: 7,
      reason: "Travel prep creates temporary staging spots that feel obvious in the moment and invisible later.",
      hiddenSpots: ["Inside a jacket pocket", "Between packing cubes", "Under itinerary papers"],
      tags: ["travel", "transition", "covered"]
    }
  ],
  glasses: [
    {
      itemCategory: "glasses",
      location: "Bedside table, couch arm, or coffee table",
      weight: 9,
      reason: "Glasses are often removed in familiar rest spots and left just out of eye level.",
      hiddenSpots: ["Under a pillow edge", "Between couch cushions", "Beside a lamp base"],
      tags: ["wood", "fabric", "familiar"]
    },
    {
      itemCategory: "glasses",
      location: "Bathroom sink, dresser, or changing area",
      weight: 8,
      reason: "Glasses get taken off during face washing, makeup, or clothing changes.",
      hiddenSpots: ["Near folded towels", "Inside a drawer lip", "On a dresser corner"],
      tags: ["water", "wood", "transition"]
    },
    {
      itemCategory: "glasses",
      location: "Bag, car seat, or jacket pocket",
      weight: 6,
      reason: "If they left the room with you, glasses often land in a case, bag, or car seat.",
      hiddenSpots: ["Soft glasses case", "Passenger seat crease", "Bag side pocket"],
      tags: ["car", "enclosed", "fabric"]
    }
  ],
  bag: [
    {
      itemCategory: "bag",
      location: "Entryway chair, floor, or hook",
      weight: 9,
      reason: "Bags often stop where the day stops: by the door, a chair, or a familiar drop point.",
      hiddenSpots: ["Behind a chair leg", "On a hook behind a coat", "Under another tote"],
      tags: ["familiar", "covered", "threshold"]
    },
    {
      itemCategory: "bag",
      location: "Car back seat, trunk, or passenger footwell",
      weight: 8,
      reason: "Backpacks and bags get moved once more during unloading and often stay in the car.",
      hiddenSpots: ["Under the front seat", "Trunk corner", "Behind the passenger seat"],
      tags: ["car", "travel", "enclosed"]
    },
    {
      itemCategory: "bag",
      location: "Office chair, desk side, or bedroom floor",
      weight: 7,
      reason: "A bag usually lands near the next task rather than in a perfect storage spot.",
      hiddenSpots: ["Under the desk", "Behind the chair", "At the side of the bed"],
      tags: ["work", "familiar", "covered"]
    }
  ],
  general: [
    {
      itemCategory: "general",
      location: "The last surface where your routine changed",
      weight: 8,
      reason: "Lost items are often set down during a quick shift in attention.",
      hiddenSpots: ["Under nearby objects", "Beside a bag", "On a chair or side table"],
      tags: ["transition", "covered", "familiar"]
    },
    {
      itemCategory: "general",
      location: "The first pocket, bag, or container you used next",
      weight: 7,
      reason: "People often stash an item automatically and remember the motion only later.",
      hiddenSpots: ["Bag liner", "Pocket corners", "Inside folded clothing"],
      tags: ["enclosed", "fabric"]
    }
  ]
};

export function behaviorEngine(input: ExtractedInput): BehaviorPattern[] {
  const itemCategory = resolveItemCategory(input.itemType);
  const results = [...ITEM_PATTERNS[itemCategory]];
  const lowerText = input.freeText.toLowerCase();

  if (/rushed|late|busy|stressed|frantic/i.test(input.emotionalContext)) {
    results.push({
      itemCategory,
      location: "Doorway, counter edge, or handoff surface",
      weight: 7,
      reason: "Rushed moments create quick put-downs near exits, counters, and bag openings.",
      hiddenSpots: ["Doorway shelf", "Counter corner", "Beside your keys or bag"],
      tags: ["transition", "covered", "threshold"]
    });
  }

  if (input.placesVisited.some((place) => /work|office/i.test(place)) || /desk|meeting|office/.test(lowerText)) {
    results.push({
      itemCategory,
      location: "Work desk, chair, and cable area",
      weight: 6,
      reason: "Work arrival routines often hide small items beside laptops, chargers, and notebooks.",
      hiddenSpots: ["Under a monitor stand", "Chair seat", "Behind a laptop sleeve"],
      tags: ["work", "covered", "wood"]
    });
  }

  if (/car|drove|parking|garage/.test(lowerText)) {
    results.push({
      itemCategory,
      location: "Car seat, console, and door pocket",
      weight: 6,
      reason: "Driving adds one more transition where items slide, wedge, or stay in the vehicle.",
      hiddenSpots: ["Seat rail", "Door pocket", "Center console edge"],
      tags: ["car", "transition", "enclosed"]
    });
  }

  return results;
}
