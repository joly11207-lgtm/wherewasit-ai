import { ExtractedInput, OptionalDetailInputs } from "@/lib/types";

const KNOWN_ITEMS = [
  "airpods",
  "earbuds",
  "headphones",
  "keys",
  "wallet",
  "phone",
  "remote",
  "glasses",
  "passport",
  "documents",
  "document",
  "backpack",
  "ring",
  "jewelry",
  "watch",
  "bag",
  "laptop",
  "charger"
];

const DISPLAY_ITEMS: Record<string, string> = {
  airpods: "AirPods",
  earbuds: "Earbuds",
  headphones: "Headphones",
  keys: "Keys",
  wallet: "Wallet",
  phone: "Phone",
  remote: "Remote",
  glasses: "Glasses",
  passport: "Passport",
  documents: "Documents",
  document: "Document",
  backpack: "Backpack",
  ring: "Ring",
  jewelry: "Jewelry",
  watch: "Watch",
  bag: "Bag",
  laptop: "Laptop",
  charger: "Charger"
};

const SELECTED_ITEM_DISPLAY: Record<string, string> = {
  keys: "Keys",
  wallet: "Wallet",
  phone: "Phone",
  "airpods / earbuds": "AirPods / Earbuds",
  "ring / jewelry": "Ring / Jewelry",
  "passport / documents": "Passport / Documents",
  glasses: "Glasses",
  "bag / backpack": "Bag / Backpack",
  other: "Other"
};

const SELECTED_PLACE_DISPLAY: Record<string, string> = {
  home: "Home",
  bedroom: "Bedroom",
  bathroom: "Bathroom",
  kitchen: "Kitchen",
  car: "Car",
  "work / office": "Work / Office",
  school: "School",
  store: "Store",
  "hotel / travel": "Hotel / Travel",
  outside: "Outside",
  "not sure": "Not sure"
};

const KNOWN_PLACES = [
  "bedroom",
  "kitchen",
  "bathroom",
  "living room",
  "office",
  "work",
  "car",
  "garage",
  "entryway",
  "hallway",
  "couch",
  "desk",
  "laundry room",
  "gym",
  "store",
  "grocery store",
  "coffee shop",
  "train",
  "bus"
];

const EMOTION_WORDS = [
  "rushed",
  "late",
  "stressed",
  "tired",
  "distracted",
  "upset",
  "anxious",
  "panicked",
  "busy",
  "calm",
  "frantic"
];

function titleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function cleanFragment(value: string): string {
  return value
    .replace(
      /\b(this|that|then|before|after|around|at|on|while|when|during|because)\b.*$/i,
      ""
    )
    .replace(
      /\b(last night|this morning|this afternoon|this evening|tonight|yesterday(?: morning| afternoon| evening)?|earlier today)\b.*$/i,
      ""
    )
    .replace(/^(my|the|our)\s+/i, "")
    .replace(/[.!,;]+$/g, "")
    .trim();
}

function extractItemType(text: string): string {
  const patterns = [
    /lost (?:my|our|the) ([a-z0-9\s'-]+)/i,
    /can't find (?:my|our|the) ([a-z0-9\s'-]+)/i,
    /cannot find (?:my|our|the) ([a-z0-9\s'-]+)/i,
    /misplaced (?:my|our|the) ([a-z0-9\s'-]+)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const item = cleanFragment(match[1]);
      const normalized = item.toLowerCase();
      return DISPLAY_ITEMS[normalized] ?? titleCase(item);
    }
  }

  const knownItem = KNOWN_ITEMS.find((item) => text.toLowerCase().includes(item));
  return knownItem ? DISPLAY_ITEMS[knownItem] ?? titleCase(knownItem) : "Item";
}

function selectedItemType(details?: OptionalDetailInputs): string | null {
  const value = details?.selectedItemType?.trim().toLowerCase();
  if (!value || value === "other") {
    return null;
  }

  return SELECTED_ITEM_DISPLAY[value] ?? titleCase(value);
}

function extractLastSeenLocation(text: string): string {
  const patterns = [
    /last (?:used|saw|had|left|remember(?:ed)? having) (?:it|them|my [a-z0-9\s'-]+)? ?(?:in|at|on) ([^.!,;]+)/i,
    /(?:had|kept) (?:it|them|my [a-z0-9\s'-]+)? ?(?:in|at|on) ([^.!,;]+)/i,
    /took (?:it|them|my [a-z0-9\s'-]+) off (?:in|at|on) ([^.!,;]+)/i,
    /last time .*?(?:in|at|on) ([^.!,;]+)/i,
    /it was (?:in|at|on) ([^.!,;]+)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return titleCase(cleanFragment(match[1]));
    }
  }

  const knownPlace = KNOWN_PLACES.find((place) => text.toLowerCase().includes(place));
  return knownPlace ? titleCase(knownPlace) : "Last known area";
}

function selectedPlace(details?: OptionalDetailInputs): string | null {
  const value = details?.selectedPlace?.trim().toLowerCase();
  if (!value || value === "not sure") {
    return null;
  }

  return SELECTED_PLACE_DISPLAY[value] ?? titleCase(value);
}

function extractLastSeenTime(text: string): string {
  const patterns = [
    /\b\d{1,2}(?::\d{2})?\s?(?:am|pm)\b/i,
    /\bthis morning\b/i,
    /\bthis afternoon\b/i,
    /\bthis evening\b/i,
    /\btonight\b/i,
    /\blast night\b/i,
    /\byesterday(?: morning| afternoon| evening)?\b/i,
    /\bjust now\b/i,
    /\bearlier today\b/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return titleCase(match[0].trim());
    }
  }

  return "Recently";
}

function selectedTimeLabel(details?: OptionalDetailInputs): string | null {
  const dateMode = details?.selectedDateMode;
  const timeMode = details?.selectedTimeMode;

  if ((!dateMode || dateMode === "not_sure") && (!timeMode || timeMode === "not_sure")) {
    return null;
  }

  const datePart =
    dateMode === "today"
      ? "Today"
      : dateMode === "yesterday"
        ? "Yesterday"
        : dateMode === "pick_date"
          ? details?.selectedDate?.trim() || "Selected date"
          : null;

  const timePart =
    timeMode === "early_morning"
      ? "Early Morning"
      : timeMode === "morning"
        ? "Morning"
        : timeMode === "afternoon"
          ? "Afternoon"
          : timeMode === "evening"
            ? "Evening"
            : timeMode === "night"
              ? "Night"
              : timeMode === "late_night"
                ? "Late Night"
                : timeMode === "approximate_hour"
                  ? details?.selectedHour?.trim() || "Approximate hour"
                  : null;

  if (datePart && timePart) {
    return `${datePart}, ${timePart}`;
  }

  return datePart ?? timePart;
}

function extractPlacesVisited(text: string): string[] {
  const segments = text
    .split(/,| then | after that | before that | and then /i)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const visited = new Set<string>();

  for (const [index, segment] of segments.entries()) {
    const movementMatch = segment.match(
      /(?:drove|went|walked|headed|stopped|came|returned|got|ran)\s+(?:back\s+)?(?:to|into|in|at)?\s*([a-z0-9\s'-]+)/i
    );

    if (movementMatch) {
      const candidate = cleanFragment(movementMatch[1]).replace(/\band\b.*$/i, "").trim();
      if (candidate) {
        visited.add(titleCase(candidate));
      }
    }

    for (const place of KNOWN_PLACES) {
      if (index > 0 && segment.toLowerCase().includes(place)) {
        visited.add(titleCase(place));
      }
    }
  }

  return Array.from(visited).filter((place) => place !== "Last Known Area");
}

function extractEmotionalContext(text: string): string {
  const found = EMOTION_WORDS.filter((word) => text.toLowerCase().includes(word));
  if (found.length === 0) {
    return "Neutral";
  }

  return titleCase(found.join(", "));
}

export function extractInput(freeText: string, details?: OptionalDetailInputs): ExtractedInput {
  const normalized = freeText.replace(/\s+/g, " ").trim();
  const extractedItem = extractItemType(normalized);
  const extractedLocation = extractLastSeenLocation(normalized);
  const extractedTime = extractLastSeenTime(normalized);

  return {
    itemType: extractedItem !== "Item" ? extractedItem : selectedItemType(details) ?? extractedItem,
    lastSeenLocation:
      extractedLocation !== "Last known area"
        ? extractedLocation
        : selectedPlace(details) ?? extractedLocation,
    lastSeenTime: extractedTime !== "Recently" ? extractedTime : selectedTimeLabel(details) ?? extractedTime,
    placesVisited: extractPlacesVisited(normalized),
    emotionalContext: extractEmotionalContext(normalized),
    freeText: normalized,
    selectedHints: details
  };
}
