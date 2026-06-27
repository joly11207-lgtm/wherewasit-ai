import { SceneProfile } from "@/lib/engine/types";

export const SCENE_PROFILES: Record<string, SceneProfile> = {
  home: {
    label: "Home",
    zones: ["entryway", "kitchen counter", "living room side table", "bedroom surface", "laundry area"],
    transitionPoints: ["coming in the door", "unloading items", "changing clothes", "moving room to room"],
    commonContainers: ["daily bag", "jacket pocket", "mail stack", "laundry basket"],
    hiddenAreas: ["under mail", "between cushions", "behind a side table", "inside clothing folds"],
    electronicAreas: ["charging area", "desk outlet", "bedside charger"],
    wetAreas: ["bathroom sink", "kitchen sink"],
    lowAreas: ["floor edge", "under chair", "under bed"],
    highAreas: ["dresser top", "shelf edge"]
  },
  bedroom: {
    label: "Bedroom",
    zones: ["nightstand", "bedside table", "dresser top", "bed surface", "closet shelf", "laundry pile"],
    transitionPoints: ["changing clothes", "getting ready", "charging devices", "going to bed"],
    commonContainers: ["nightstand drawer", "hoodie pocket", "jewelry tray", "laundry basket", "jacket pocket"],
    hiddenAreas: ["under blankets", "pillow folds", "inside a drawer lip", "behind the nightstand", "under clothes"],
    electronicAreas: ["charging cable area", "bedside outlet"],
    lowAreas: ["bed frame edge", "floor beside bed"],
    highAreas: ["dresser top", "closet shelf"]
  },
  kitchen: {
    label: "Kitchen",
    zones: ["sink edge", "counter edge", "drain area", "island", "sink area", "drop zone near entry", "table"],
    transitionPoints: ["unloading bags", "setting down groceries", "washing hands", "sorting mail"],
    commonContainers: ["grocery bags", "tote bag", "drawer lip", "mail pile", "jacket pocket"],
    hiddenAreas: ["under a dish towel", "under cutting board", "near soap dispenser", "under paper or receipts", "between grocery bags", "beside appliances"],
    electronicAreas: ["charging corner", "small appliance outlet"],
    wetAreas: ["sink edge", "dish rack"],
    lowAreas: ["floor near island", "under table"],
    highAreas: ["counter top", "fridge top tray"]
  },
  bathroom: {
    label: "Bathroom",
    zones: ["sink counter", "vanity", "shower shelf", "towel area", "laundry hamper edge"],
    transitionPoints: ["washing hands", "showering", "doing skincare", "changing accessories"],
    commonContainers: ["small dish", "drawer organizer", "laundry basket", "toiletry bag"],
    hiddenAreas: ["behind toiletries", "inside towel folds", "near the drain edge", "under the vanity lip"],
    electronicAreas: ["counter outlet", "mirror ledge"],
    wetAreas: ["sink area", "shower area", "floor drain"],
    lowAreas: ["bath mat edge", "under vanity"],
    highAreas: ["mirror ledge", "top shelf"]
  },
  car: {
    label: "Car",
    zones: ["center console", "door pocket", "back seat", "trunk", "driver seat", "passenger seat"],
    transitionPoints: ["getting in", "parking", "unloading", "grabbing a bag"],
    commonContainers: ["center console", "door pocket", "cup holder", "back seat pocket", "trunk side pocket"],
    hiddenAreas: ["seat gap", "floor mat", "under seat rail", "trunk corner", "between bags"],
    electronicAreas: ["charging cable area", "console outlet"],
    lowAreas: ["floor mat", "under seat"],
    highAreas: ["dashboard ledge", "seat top"]
  },
  office: {
    label: "Office",
    zones: ["desk surface", "chair area", "meeting room", "printer station", "bag drop spot"],
    transitionPoints: ["arriving at desk", "starting a meeting", "plugging in devices", "packing to leave"],
    commonContainers: ["work bag", "laptop sleeve", "desk drawer", "jacket pocket"],
    hiddenAreas: ["under papers", "behind the monitor", "under the desk edge", "inside a laptop sleeve"],
    electronicAreas: ["charging area", "monitor stand", "printer outlet"],
    lowAreas: ["under chair", "floor beside desk"],
    highAreas: ["top shelf", "filing tray"]
  },
  gym: {
    label: "Gym",
    zones: ["locker area", "bench area", "shower area", "sink area", "dryer station", "charging area", "exit path"],
    transitionPoints: ["changing clothes", "packing bag", "showering", "leaving locker", "entering car"],
    commonContainers: ["gym bag", "locker", "towel", "jacket pocket", "shoe compartment"],
    hiddenAreas: ["locker gaps", "bench underside", "towel folds", "bag lining"],
    electronicAreas: ["charging station", "dryer area", "near outlets"],
    wetAreas: ["shower area", "sink counter", "floor drain"],
    lowAreas: ["floor edge", "under bench", "bottom locker shelf"],
    highAreas: ["top locker shelf", "mirror ledge"]
  },
  cafe: {
    label: "Cafe",
    zones: [
      "payment terminal",
      "counter area",
      "cafe table",
      "chair area",
      "table edge",
      "floor near table",
      "window seat",
      "restroom",
      "pickup shelf",
      "bag area"
    ],
    transitionPoints: [
      "paying",
      "picking up drink",
      "moving bag",
      "standing up",
      "sitting down",
      "leaving table",
      "checking phone",
      "using restroom"
    ],
    commonContainers: ["receipt stack", "bag pocket", "card holder", "wallet", "phone case", "coat pocket", "tote bag"],
    hiddenAreas: ["inside receipt stack", "under table edge", "chair gap", "under napkins", "bag lining", "floor near chair"],
    electronicAreas: ["payment terminal", "charging outlet", "pickup counter"],
    lowAreas: ["floor near chair", "under table", "chair leg area"],
    highAreas: ["counter surface", "pickup shelf", "window ledge"]
  },
  restaurant: {
    label: "Restaurant",
    zones: ["dining table", "booth seat", "chair area", "coat area", "payment counter", "host stand", "floor near table", "restroom"],
    transitionPoints: ["sitting down", "standing up", "paying bill", "moving bag", "leaving table", "taking coat", "using restroom"],
    commonContainers: ["napkin stack", "coat pocket", "bag pocket", "wallet", "card holder", "receipt folder"],
    hiddenAreas: ["under menu", "chair gap", "booth gap", "under napkins", "under table edge", "floor near chair"],
    electronicAreas: ["payment terminal"],
    wetAreas: ["restroom sink", "table spill area"],
    lowAreas: ["floor near table", "booth gap", "under chair"],
    highAreas: ["table surface", "host counter"]
  },
  hotel: {
    label: "Hotel",
    zones: [
      "hotel room",
      "bed area",
      "nightstand",
      "bathroom counter",
      "desk surface",
      "luggage area",
      "closet",
      "safe area",
      "checkout path"
    ],
    transitionPoints: [
      "packing luggage",
      "checking out",
      "moving documents",
      "leaving room",
      "using bathroom",
      "charging devices"
    ],
    commonContainers: [
      "suitcase",
      "passport holder",
      "document sleeve",
      "backpack pocket",
      "jacket pocket",
      "hotel safe",
      "toiletry bag"
    ],
    hiddenAreas: [
      "under bed edge",
      "between sheets",
      "behind nightstand items",
      "inside suitcase lining",
      "under folded clothes",
      "desk papers"
    ],
    electronicAreas: ["charging outlet", "desk lamp area", "bedside charging station"],
    wetAreas: ["bathroom counter", "sink area", "toiletry bag"],
    lowAreas: ["under bed edge", "floor near luggage", "bottom closet shelf"],
    highAreas: ["closet shelf", "top of safe", "desk shelf"]
  },
  travel: {
    label: "Travel",
    zones: [
      "airport security tray",
      "boarding area",
      "gate seat",
      "seat pocket",
      "luggage handle",
      "taxi or rideshare",
      "luggage area",
      "check-in counter",
      "restroom"
    ],
    transitionPoints: [
      "security check",
      "placing items in tray",
      "collecting items after screening",
      "boarding",
      "getting out of car",
      "checking in",
      "moving luggage",
      "sitting down"
    ],
    commonContainers: [
      "passport holder",
      "document sleeve",
      "backpack",
      "backpack pocket",
      "seat pocket",
      "jacket pocket",
      "suitcase side pocket"
    ],
    hiddenAreas: [
      "tray corner",
      "bag lining",
      "seat gap",
      "under table",
      "tray corner",
      "folder stack",
      "luggage side pocket",
      "taxi floor"
    ],
    electronicAreas: ["charging station", "gate outlet", "cafe outlet"],
    wetAreas: ["restroom sink", "cafe table"],
    lowAreas: ["floor near seat", "under table", "taxi floor"],
    highAreas: ["counter surface", "suitcase handle", "overhead bin"]
  },
  living_room: {
    label: "Living Room",
    zones: ["coffee table", "side table", "media console", "couch", "charging area", "remote basket"],
    transitionPoints: ["sitting down", "watching TV", "charging devices", "getting up to move rooms"],
    commonContainers: ["remote basket", "blanket basket", "hoodie pocket", "side drawer", "bag corner"],
    hiddenAreas: ["between cushions", "under a throw blanket", "couch gaps", "blanket folds", "behind the side table", "under the couch edge"],
    electronicAreas: ["media console", "charging cable area"],
    lowAreas: ["rug edge", "under couch"],
    highAreas: ["side table", "media shelf"]
  },
  other: {
    label: "Other",
    zones: ["main surface", "entry path", "nearest chair", "bag drop spot", "table edge"],
    transitionPoints: ["arriving", "setting something down", "changing tasks", "leaving again"],
    commonContainers: ["bag pocket", "jacket pocket", "drawer", "open-top container"],
    hiddenAreas: ["under nearby objects", "behind furniture", "inside folds", "along floor edges"],
    electronicAreas: ["charging area", "desk edge"],
    lowAreas: ["floor edge", "under furniture"],
    highAreas: ["shelf edge", "table top"]
  }
};
