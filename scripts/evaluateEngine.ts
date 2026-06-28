import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { runInvestigationEngine } from "../lib/engine";
import { RAW_HEURISTIC_COUNT } from "../lib/engine/heuristics";
import { Direction, EngineInput, HeuristicWeights, InvestigationEngineResult, KnowledgeReading } from "../lib/engine/types";

type EngineCase = {
  id: string;
  title: string;
  input: EngineInput;
  expected: {
    scene: string;
    mustIncludePriorityTerms: string[];
    mustIncludeSignals: string[];
    mustNotIncludePriorityTerms: string[];
  };
};

type CaseEvaluation = {
  testCase: EngineCase;
  result: InvestigationEngineResult;
  passed: boolean;
  reasons: string[];
  matchedPriorityTerms: string[];
  matchedSignals: string[];
  forbiddenPriorityTerms: string[];
  topEnvironmentContributors: string[];
  topBehaviorContributors: string[];
};

type BreakdownRow = {
  key: string;
  caseCount: number;
  scenePasses: number;
  totalPriorityTerms: number;
  matchedPriorityTerms: number;
  totalSignalTerms: number;
  matchedSignals: number;
  failedCaseIds: string[];
};

type HeuristicAggregateRow = {
  source: string;
  caseCount: number;
  totalDirectionWeight: number;
  totalEnvironmentWeight: number;
  totalBehaviorWeight: number;
  directionCounts: Record<string, number>;
  environmentCounts: Record<string, number>;
  behaviorCounts: Record<string, number>;
};

function divider(label?: string): void {
  const line = "=".repeat(96);
  console.log(`\n${line}`);
  if (label) {
    console.log(label);
    console.log(line);
  }
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function includesNormalized(haystack: string, needle: string): boolean {
  return normalize(haystack).includes(normalize(needle));
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

function aggregateDirectionContributors(heuristics: HeuristicWeights[]): string[] {
  const totals = heuristics.reduce<Record<string, number>>((accumulator, heuristic) => {
    Object.entries(heuristic.directionWeights).forEach(([key, value]) => {
      accumulator[key] = round((accumulator[key] ?? 0) + (value ?? 0) * heuristic.confidence);
    });
    return accumulator;
  }, {});

  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key, value]) => `${key}:${value}`);
}

function aggregateWeightContributors(
  heuristics: HeuristicWeights[],
  selector: (heuristic: HeuristicWeights) => Record<string, number>
): string[] {
  const totals = heuristics.reduce<Record<string, number>>((accumulator, heuristic) => {
    Object.entries(selector(heuristic)).forEach(([key, value]) => {
      accumulator[key] = round((accumulator[key] ?? 0) + value * heuristic.confidence);
    });
    return accumulator;
  }, {});

  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([key, value]) => `${key}:${value}`);
}

function formatTopMap(weights: Partial<Record<string, number>>, limit: number): string {
  const entries = Object.entries(weights)
    .filter(([, value]) => typeof value === "number" && value > 0)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, limit)
    .map(([key, value]) => `${key} +${round(value ?? 0)}`);

  return entries.length > 0 ? entries.join(", ") : "none";
}

function printHeuristicAttribution(heuristics: HeuristicWeights[]): void {
  console.log("Heuristic Attribution:");
  heuristics.forEach((heuristic) => {
    console.log(`- ${heuristic.source}:`);
    console.log(`  directions: ${formatTopMap(heuristic.directionWeights, 2)}`);
    console.log(`  environment: ${formatTopMap(heuristic.environmentWeights, 3)}`);
    console.log(`  behavior: ${formatTopMap(heuristic.behaviorWeights, 3)}`);
    console.log(`  tags: ${heuristic.reasonTags.slice(0, 5).join(", ") || "none"}`);
  });
}

function findReading(heuristics: HeuristicWeights[], source: string): KnowledgeReading | undefined {
  return heuristics.find((heuristic) => heuristic.source === source)?.reading;
}

function formatReadingList(values: string[] | Direction[]): string {
  return values.length > 0 ? values.join(", ") : "none";
}

function printKnowledgeReadingDebug(heuristics: HeuristicWeights[]): void {
  const liurenReading = findReading(heuristics, "liuren");
  const lostSongReading = findReading(heuristics, "lostSong");

  console.log("Knowledge Reading Debug:");

  if (liurenReading) {
    console.log(`- liuren resultKey: ${liurenReading.resultKey}`);
    console.log(`  directions: ${formatReadingList(liurenReading.directions)}`);
    console.log(`  environments: ${formatReadingList(liurenReading.environments)}`);
    console.log(
      `  height / distance / movement: ${liurenReading.height} / ${liurenReading.distance} / ${liurenReading.movement}`
    );
  } else {
    console.log("- liuren: none");
  }

  if (lostSongReading) {
    console.log(`- lostSong resultKey: ${lostSongReading.resultKey}`);
    console.log(`  directions: ${formatReadingList(lostSongReading.directions)}`);
    console.log(`  environments: ${formatReadingList(lostSongReading.environments)}`);
    console.log(
      `  height / distance / movement: ${lostSongReading.height} / ${lostSongReading.distance} / ${lostSongReading.movement}`
    );
  } else {
    console.log("- lostSong: none");
  }
}

function extractContributorKeys(entries: string[]): string[] {
  return entries.map((entry) => entry.split(":")[0]?.trim()).filter(Boolean);
}

function formatDirections(result: InvestigationEngineResult): string[] {
  return result.topDirections.map(
    (entry, index) =>
      `${index + 1}. ${entry.direction} (${entry.score})${entry.tags.length ? ` | tags: ${entry.tags.join(", ")}` : ""}`
  );
}

function loadCases(): EngineCase[] {
  const casesDirectory = path.join(process.cwd(), "cases");
  return readdirSync(casesDirectory)
    .filter((fileName) => fileName.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) => {
      const filePath = path.join(casesDirectory, fileName);
      const contents = readFileSync(filePath, "utf8");
      return JSON.parse(contents) as EngineCase;
    });
}

function evaluateCase(testCase: EngineCase): CaseEvaluation {
  const result = runInvestigationEngine(testCase.input);
  const reasons: string[] = [];
  const searchLabels = result.searchPriority.slice(0, 5).map((entry) => entry.label);
  const signalPool = new Set<string>([
    ...result.topDirections.flatMap((entry) => entry.tags),
    ...extractContributorKeys(aggregateWeightContributors(result.heuristicWeights, (entry) => entry.environmentWeights)),
    ...extractContributorKeys(aggregateWeightContributors(result.heuristicWeights, (entry) => entry.behaviorWeights)),
    ...result.searchPriority.flatMap((entry) => entry.relatedTags)
  ].map((entry) => normalize(entry)));

  const matchedPriorityTerms = testCase.expected.mustIncludePriorityTerms.filter((term) =>
    searchLabels.some((label) => includesNormalized(label, term))
  );
  const matchedSignals = testCase.expected.mustIncludeSignals.filter((signal) =>
    Array.from(signalPool).some((entry) => includesNormalized(entry, signal))
  );
  const forbiddenPriorityTerms = testCase.expected.mustNotIncludePriorityTerms.filter((term) =>
    searchLabels.some((label) => includesNormalized(label, term))
  );

  if (!includesNormalized(result.sceneProfile.profile.label, testCase.expected.scene)) {
    reasons.push(`Scene mismatch: expected ${testCase.expected.scene}, got ${result.sceneProfile.profile.label}.`);
  }

  if (matchedPriorityTerms.length === 0) {
    reasons.push(
      `No expected priority term matched. Expected one of: ${testCase.expected.mustIncludePriorityTerms.join(", ")}.`
    );
  }

  if (matchedSignals.length === 0) {
    reasons.push(`No expected signal matched. Expected one of: ${testCase.expected.mustIncludeSignals.join(", ")}.`);
  }

  if (forbiddenPriorityTerms.length > 0) {
    reasons.push(`Forbidden priority terms appeared: ${forbiddenPriorityTerms.join(", ")}.`);
  }

  return {
    testCase,
    result,
    passed: reasons.length === 0,
    reasons,
    matchedPriorityTerms,
    matchedSignals,
    forbiddenPriorityTerms,
    topEnvironmentContributors: aggregateWeightContributors(result.heuristicWeights, (entry) => entry.environmentWeights),
    topBehaviorContributors: aggregateWeightContributors(result.heuristicWeights, (entry) => entry.behaviorWeights)
  };
}

function printCaseEvaluation(evaluation: CaseEvaluation, index: number, total: number): void {
  const { testCase, result } = evaluation;

  divider(`${index + 1}. ${testCase.title} (${testCase.id})`);
  console.log(`Case ${index + 1} of ${total}`);
  console.log(`Confidence Score: ${result.confidenceScore}`);
  console.log(`Detected Scene: ${result.sceneProfile.profile.label}`);
  console.log(`Top Directions: ${formatDirections(result).join(" | ")}`);
  console.log(`Top 5 Search Priority: ${result.searchPriority.slice(0, 5).map((entry) => entry.label).join(" -> ")}`);
  console.log(`Top Environment Contributors: ${evaluation.topEnvironmentContributors.join(", ") || "none"}`);
  console.log(`Top Behavior Contributors: ${evaluation.topBehaviorContributors.join(", ") || "none"}`);
  console.log(
    `Priority Hit: ${evaluation.matchedPriorityTerms.length}/${testCase.expected.mustIncludePriorityTerms.length}`
  );
  console.log(`Forbidden Hit: ${evaluation.forbiddenPriorityTerms.length}`);
  console.log(`Signal Hit: ${evaluation.matchedSignals.length}/${testCase.expected.mustIncludeSignals.length}`);
  console.log(
    `Heuristic Summary: raw=${RAW_HEURISTIC_COUNT}, normalized=${result.heuristicWeights.length}, direction=${aggregateDirectionContributors(result.heuristicWeights).join(", ") || "none"}`
  );
  printKnowledgeReadingDebug(result.heuristicWeights);
  printHeuristicAttribution(result.heuristicWeights);
  console.log(
    `Matched Priority Terms: ${evaluation.matchedPriorityTerms.length > 0 ? evaluation.matchedPriorityTerms.join(", ") : "none"}`
  );
  console.log(`Matched Signals: ${evaluation.matchedSignals.length > 0 ? evaluation.matchedSignals.join(", ") : "none"}`);

  if (evaluation.passed) {
    console.log("Result: PASS");
    return;
  }

  console.log("Result: FAIL");
  evaluation.reasons.forEach((reason) => console.log(`- ${reason}`));
}

function printSummary(evaluations: CaseEvaluation[]): void {
  const passed = evaluations.filter((entry) => entry.passed);
  const failed = evaluations.filter((entry) => !entry.passed);
  const scenePasses = evaluations.filter((entry) =>
    includesNormalized(entry.result.sceneProfile.profile.label, entry.testCase.expected.scene)
  ).length;
  const totalPriorityTerms = evaluations.reduce(
    (total, entry) => total + entry.testCase.expected.mustIncludePriorityTerms.length,
    0
  );
  const matchedPriorityTerms = evaluations.reduce((total, entry) => total + entry.matchedPriorityTerms.length, 0);
  const totalSignalTerms = evaluations.reduce((total, entry) => total + entry.testCase.expected.mustIncludeSignals.length, 0);
  const matchedSignals = evaluations.reduce((total, entry) => total + entry.matchedSignals.length, 0);
  const averagePriorityHitRate = totalPriorityTerms > 0 ? (matchedPriorityTerms / totalPriorityTerms) * 100 : 0;
  const averageSignalHitRate = totalSignalTerms > 0 ? (matchedSignals / totalSignalTerms) * 100 : 0;
  const failedReasonCounts = failed.reduce<Record<string, number>>((accumulator, entry) => {
    entry.reasons.forEach((reason) => {
      accumulator[reason] = (accumulator[reason] ?? 0) + 1;
    });
    return accumulator;
  }, {});
  const topFailedReasons = Object.entries(failedReasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => `${count}x ${reason}`);

  divider("Evaluation Summary");
  console.log(`Total cases: ${evaluations.length}`);
  console.log(`Passed: ${passed.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Scene Accuracy: ${scenePasses}/${evaluations.length} = ${round((scenePasses / evaluations.length) * 100)}%`);
  console.log(`Average Priority Hit Rate: ${matchedPriorityTerms}/${totalPriorityTerms} = ${round(averagePriorityHitRate)}%`);
  console.log(`Average Signal Hit Rate: ${matchedSignals}/${totalSignalTerms} = ${round(averageSignalHitRate)}%`);
  console.log(`Failed case ids: ${failed.length > 0 ? failed.map((entry) => entry.testCase.id).join(", ") : "none"}`);

  if (failed.length === 0) {
    console.log("All cases completed under the current V1 knowledge-engine checks.");
    console.log("Top failed reasons: none");
    printBreakdowns(evaluations);
    return;
  }

  console.log(`Top failed reasons: ${topFailedReasons.join(" | ") || "none"}`);
  console.log("\nFailure Reasons");
  failed.forEach((entry) => {
    console.log(`${entry.testCase.id}: ${entry.reasons.join(" | ")}`);
  });
  printBreakdowns(evaluations);
}

function buildBreakdownRows(
  evaluations: CaseEvaluation[],
  keySelector: (evaluation: CaseEvaluation) => string
): BreakdownRow[] {
  const grouped = evaluations.reduce<Record<string, BreakdownRow>>((accumulator, evaluation) => {
    const key = keySelector(evaluation);

    if (!accumulator[key]) {
      accumulator[key] = {
        key,
        caseCount: 0,
        scenePasses: 0,
        totalPriorityTerms: 0,
        matchedPriorityTerms: 0,
        totalSignalTerms: 0,
        matchedSignals: 0,
        failedCaseIds: []
      };
    }

    const row = accumulator[key];
    row.caseCount += 1;
    row.totalPriorityTerms += evaluation.testCase.expected.mustIncludePriorityTerms.length;
    row.matchedPriorityTerms += evaluation.matchedPriorityTerms.length;
    row.totalSignalTerms += evaluation.testCase.expected.mustIncludeSignals.length;
    row.matchedSignals += evaluation.matchedSignals.length;

    if (includesNormalized(evaluation.result.sceneProfile.profile.label, evaluation.testCase.expected.scene)) {
      row.scenePasses += 1;
    }

    if (!evaluation.passed) {
      row.failedCaseIds.push(evaluation.testCase.id);
    }

    return accumulator;
  }, {});

  return Object.values(grouped).sort((left, right) => {
    const leftPriorityRate = left.totalPriorityTerms > 0 ? left.matchedPriorityTerms / left.totalPriorityTerms : 0;
    const rightPriorityRate = right.totalPriorityTerms > 0 ? right.matchedPriorityTerms / right.totalPriorityTerms : 0;

    if (leftPriorityRate !== rightPriorityRate) {
      return leftPriorityRate - rightPriorityRate;
    }

    return left.key.localeCompare(right.key);
  });
}

function buildHeuristicAggregateRows(evaluations: CaseEvaluation[]): HeuristicAggregateRow[] {
  const grouped = evaluations.reduce<Record<string, HeuristicAggregateRow>>((accumulator, evaluation) => {
    evaluation.result.heuristicWeights.forEach((heuristic) => {
      if (!accumulator[heuristic.source]) {
        accumulator[heuristic.source] = {
          source: heuristic.source,
          caseCount: 0,
          totalDirectionWeight: 0,
          totalEnvironmentWeight: 0,
          totalBehaviorWeight: 0,
          directionCounts: {},
          environmentCounts: {},
          behaviorCounts: {}
        };
      }

      const row = accumulator[heuristic.source];
      row.caseCount += 1;

      Object.entries(heuristic.directionWeights).forEach(([key, value]) => {
        const weighted = round((value ?? 0) * heuristic.confidence);
        row.totalDirectionWeight += weighted;
        row.directionCounts[key] = round((row.directionCounts[key] ?? 0) + weighted);
      });

      Object.entries(heuristic.environmentWeights).forEach(([key, value]) => {
        const weighted = round(value * heuristic.confidence);
        row.totalEnvironmentWeight += weighted;
        row.environmentCounts[key] = round((row.environmentCounts[key] ?? 0) + weighted);
      });

      Object.entries(heuristic.behaviorWeights).forEach(([key, value]) => {
        const weighted = round(value * heuristic.confidence);
        row.totalBehaviorWeight += weighted;
        row.behaviorCounts[key] = round((row.behaviorCounts[key] ?? 0) + weighted);
      });
    });

    return accumulator;
  }, {});

  return Object.values(grouped).sort((left, right) => {
    const leftTotal = left.totalDirectionWeight + left.totalEnvironmentWeight + left.totalBehaviorWeight;
    const rightTotal = right.totalDirectionWeight + right.totalEnvironmentWeight + right.totalBehaviorWeight;
    return rightTotal - leftTotal;
  });
}

function printHeuristicAggregateSummary(evaluations: CaseEvaluation[]): void {
  const rows = buildHeuristicAggregateRows(evaluations);
  const allHeuristics = evaluations.flatMap((evaluation) => evaluation.result.heuristicWeights);
  const mostCommonDirections = aggregateDirectionContributors(allHeuristics);
  const mostCommonEnvironments = aggregateWeightContributors(allHeuristics, (entry) => entry.environmentWeights);
  const mostCommonBehaviors = aggregateWeightContributors(allHeuristics, (entry) => entry.behaviorWeights);

  divider("Heuristic Aggregate Summary");
  rows.forEach((row) => {
    const averageDirection = row.caseCount > 0 ? round(row.totalDirectionWeight / row.caseCount) : 0;
    const averageEnvironment = row.caseCount > 0 ? round(row.totalEnvironmentWeight / row.caseCount) : 0;
    const averageBehavior = row.caseCount > 0 ? round(row.totalBehaviorWeight / row.caseCount) : 0;

    console.log(`Source: ${row.source}`);
    console.log(`Average contribution: directions ${averageDirection}, environment ${averageEnvironment}, behavior ${averageBehavior}`);
    console.log(`Most common directions: ${formatTopMap(row.directionCounts, 2)}`);
    console.log(`Most common environment contributors: ${formatTopMap(row.environmentCounts, 3)}`);
    console.log(`Most common behavior contributors: ${formatTopMap(row.behaviorCounts, 3)}`);
    console.log("");
  });

  console.log(`Overall most common direction contributors: ${mostCommonDirections.join(", ") || "none"}`);
  console.log(`Overall most common environment contributors: ${mostCommonEnvironments.join(", ") || "none"}`);
  console.log(`Overall most common behavior contributors: ${mostCommonBehaviors.join(", ") || "none"}`);
}

function printSceneBreakdown(rows: BreakdownRow[]): void {
  divider("Per-Scene Breakdown");

  rows.forEach((row) => {
    const sceneAccuracy = row.caseCount > 0 ? round((row.scenePasses / row.caseCount) * 100) : 0;
    const priorityRate = row.totalPriorityTerms > 0 ? round((row.matchedPriorityTerms / row.totalPriorityTerms) * 100) : 0;
    const signalRate = row.totalSignalTerms > 0 ? round((row.matchedSignals / row.totalSignalTerms) * 100) : 0;

    console.log(`Scene: ${row.key}`);
    console.log(`Cases: ${row.caseCount}`);
    console.log(`Scene Accuracy: ${row.scenePasses}/${row.caseCount} = ${sceneAccuracy}%`);
    console.log(`Priority Hit Rate: ${row.matchedPriorityTerms}/${row.totalPriorityTerms} = ${priorityRate}%`);
    console.log(`Signal Hit Rate: ${row.matchedSignals}/${row.totalSignalTerms} = ${signalRate}%`);
    console.log(`Failed case ids: ${row.failedCaseIds.length > 0 ? row.failedCaseIds.join(", ") : "none"}`);
    console.log("");
  });
}

function printItemBreakdown(rows: BreakdownRow[]): void {
  divider("Per-Item Breakdown");

  rows.forEach((row) => {
    const priorityRate = row.totalPriorityTerms > 0 ? round((row.matchedPriorityTerms / row.totalPriorityTerms) * 100) : 0;
    const signalRate = row.totalSignalTerms > 0 ? round((row.matchedSignals / row.totalSignalTerms) * 100) : 0;

    console.log(`Item: ${row.key}`);
    console.log(`Cases: ${row.caseCount}`);
    console.log(`Priority Hit Rate: ${row.matchedPriorityTerms}/${row.totalPriorityTerms} = ${priorityRate}%`);
    console.log(`Signal Hit Rate: ${row.matchedSignals}/${row.totalSignalTerms} = ${signalRate}%`);
    console.log(`Failed case ids: ${row.failedCaseIds.length > 0 ? row.failedCaseIds.join(", ") : "none"}`);
    console.log("");
  });
}

function printBreakdowns(evaluations: CaseEvaluation[]): void {
  const sceneRows = buildBreakdownRows(evaluations, (evaluation) => evaluation.testCase.expected.scene);
  const itemRows = buildBreakdownRows(evaluations, (evaluation) => evaluation.testCase.input.item);

  printSceneBreakdown(sceneRows);
  printItemBreakdown(itemRows);
  printHeuristicAggregateSummary(evaluations);
}

function main(): void {
  const testCases = loadCases();

  divider("WhereWasIt.ai V1 Knowledge Engine Evaluation");
  console.log(`Scenario count: ${testCases.length}`);
  console.log("GPT is not used in this script.");
  console.log("This script evaluates only runInvestigationEngine(input) against the local case library.");

  const evaluations = testCases.map(evaluateCase);
  evaluations.forEach((evaluation, index) => {
    printCaseEvaluation(evaluation, index, evaluations.length);
  });
  printSummary(evaluations);
}

main();
