import { narrateWithModel, renderReportMarkdown } from "../lib/aiNarrator";
import { analyzeClues } from "../lib/analyzeClues";
import { NarrationResult } from "../lib/types";

type Scenario = {
  name: string;
  input: string;
};

const models = [
  "deepseek/deepseek-chat",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.5-pro"
];

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
    name: "Passport before travel",
    input:
      "I lost my passport while packing for a trip. I had it on my desk last night, then put things into my travel bag and jacket."
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

function printDiagnostics(narration: NarrationResult): void {
  const diagnostics = narration.diagnostics;
  if (!diagnostics) {
    console.log("Diagnostics:");
    console.log("- model name: unavailable");
    console.log("- request status code: unavailable");
    console.log("- error message: unavailable");
    console.log("- fallback reason: unavailable");
    return;
  }

  console.log("Diagnostics:");
  console.log(`- model name: ${diagnostics.model}`);
  console.log(
    `- request status code: ${diagnostics.statusCode === null ? "not available" : diagnostics.statusCode}`
  );
  console.log(`- error message: ${diagnostics.errorMessage ?? "none"}`);
  console.log(`- fallback reason: ${diagnostics.fallbackReason ?? "none"}`);

  if (diagnostics.responseBodyOnFailure) {
    console.log("- response body on failure:");
    console.log(diagnostics.responseBodyOnFailure);
  }

  if (process.env.DEBUG_OPENROUTER === "true") {
    console.log("- full OpenRouter response:");
    console.log(JSON.stringify(diagnostics.debugResponse ?? null, null, 2));
  }
}

async function main(): Promise<void> {
  divider("WhereWasIt.ai Narrator Evaluation");
  console.log(`Scenario count: ${scenarios.length}`);
  console.log(`Model count: ${models.length}`);
  console.log("Comparison focus: clarity, warmth, practical usefulness, light mystical tone, and natural American English.");
  console.log(`DEBUG_OPENROUTER: ${process.env.DEBUG_OPENROUTER === "true" ? "enabled" : "disabled"}`);

  if (!process.env.OPENROUTER_API_KEY) {
    console.log("OPENROUTER_API_KEY is not set. Models will fall back to the local template report.");
  }

  for (const scenario of scenarios) {
    const analysis = analyzeClues(scenario.input);

    divider(`Scenario: ${scenario.name}`);
    console.log("Input:");
    console.log(scenario.input);
    console.log("\nShared local engine summary:");
    console.log(
      JSON.stringify(
        {
          itemType: analysis.input.itemType,
          itemCategory: analysis.itemCategory,
          lastSeenLocation: analysis.input.lastSeenLocation,
          lastSeenTime: analysis.input.lastSeenTime,
          topLocations: analysis.probabilities.slice(0, 3).map((entry) => ({
            location: entry.location,
            score: entry.score,
            topReason: entry.reasons[0]
          }))
        },
        null,
        2
      )
    );

    for (const model of models) {
      divider(`Model: ${model}`);

      try {
        const narration = await narrateWithModel(analysis, model);
        console.log(`Used fallback: ${narration.usedFallback ? "yes" : "no"}`);
        printDiagnostics(narration);
        console.log("Narrator output:");
        console.log(renderReportMarkdown(narration.report));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.log(`Model failed: ${message}`);
      }
    }
  }
}

void main();
