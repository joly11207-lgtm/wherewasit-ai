import { analyzeClues } from "../lib/analyzeClues";

type Scenario = {
  name: string;
  input: string;
};

const scenarios: Scenario[] = [
  {
    name: "AirPods between bedroom, car, and office",
    input:
      "I lost my AirPods. I last used them in my bedroom this morning, then drove to work and sat at my desk."
  },
  {
    name: "Wedding ring after showering",
    input:
      "I misplaced my wedding ring. I took it off in the bathroom before showering, then changed clothes in the bedroom."
  },
  {
    name: "Wallet after grocery shopping",
    input:
      "I can't find my wallet. I used it at the grocery store, drove home, carried bags inside, and dropped things on the kitchen counter."
  },
  {
    name: "Passport before travel",
    input:
      "I lost my passport while packing for a trip. I had it on my desk last night, then put things into my travel bag and jacket."
  },
  {
    name: "Glasses near couch and bedroom",
    input:
      "I misplaced my glasses after watching TV on the couch and going to bed. I remember them in the living room earlier tonight."
  },
  {
    name: "Keys after arriving home",
    input:
      "I lost my keys. I had them when I got out of the car, then I came inside, put groceries down, and rushed to change clothes."
  },
  {
    name: "Phone lost in a hotel room",
    input:
      "I can't find my phone. I remember using it in my hotel room last night, then I showered and packed my bag before checkout."
  },
  {
    name: "Backpack after school and work",
    input:
      "I lost my backpack. I had it at school this afternoon, drove to work, then came home and dropped things near the entryway."
  },
  {
    name: "Jewelry lost during laundry",
    input:
      "I misplaced my jewelry. I took it off in the bedroom while doing laundry, then carried clothes to the hamper and laundry room."
  },
  {
    name: "Documents between office and car",
    input:
      "I lost some documents. I had them on my office desk before leaving work, then walked to the car and drove home."
  }
];

function divider(label?: string): void {
  const line = "=".repeat(78);
  console.log(`\n${line}`);
  if (label) {
    console.log(label);
    console.log(line);
  }
}

function printJson(title: string, value: unknown): void {
  console.log(`${title}:`);
  console.log(JSON.stringify(value, null, 2));
}

function main(): void {
  divider("WhereWasIt.ai Local Engine Evaluation");
  console.log(`Scenario count: ${scenarios.length}`);
  console.log("OpenRouter is not used in this script.");

  scenarios.forEach((scenario, index) => {
    const analysis = analyzeClues(scenario.input);

    divider(`${index + 1}. ${scenario.name}`);
    console.log("Input:");
    console.log(scenario.input);

    printJson("Extracted fields", {
      itemType: analysis.input.itemType,
      itemCategory: analysis.itemCategory,
      lastSeenLocation: analysis.input.lastSeenLocation,
      lastSeenTime: analysis.input.lastSeenTime,
      placesVisited: analysis.input.placesVisited,
      emotionalContext: analysis.input.emotionalContext
    });

    printJson("Memory engine", {
      timeGapLabel: analysis.memory.timeGapLabel,
      transitionMoments: analysis.memory.transitionMoments,
      handoffRisk: analysis.memory.handoffRisk,
      topCandidates: [...analysis.memory.candidates]
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 5)
    });

    printJson(
      "Behavior engine",
      [...analysis.behavior]
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 5)
        .map((entry) => ({
          location: entry.location,
          weight: entry.weight,
          reason: entry.reason,
          hiddenSpots: entry.hiddenSpots
        }))
    );

    printJson("Wisdom engine", {
      signal: analysis.wisdom.signal,
      directionHint: analysis.wisdom.directionHint,
      cues: analysis.wisdom.cues,
      topCandidates: [...analysis.wisdom.candidates]
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 5)
    });

    printJson(
      "Final ranked locations",
      analysis.probabilities.map((entry) => ({
        location: entry.location,
        score: entry.score,
        memoryScore: entry.memoryScore,
        behaviorScore: entry.behaviorScore,
        wisdomScore: entry.wisdomScore,
        topReason: entry.reasons[0],
        hiddenSpots: entry.hiddenSpots.slice(0, 4)
      }))
    );

    printJson("Search planner output", analysis.searchPlan);
  });
}

main();
