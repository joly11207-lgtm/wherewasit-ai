import { LocalAnalysis, NarrationResult, ReportSections } from "@/lib/types";

const NARRATOR_SYSTEM_PROMPT = `You are a calm, reassuring, practical Lost Item Search Coach.

Your job is to turn a local lost-item analysis into a helpful search experience for an English-speaking user in natural American English.
The investigation has already been completed. You are not responsible for calculating where the item is. Your job is only to explain the investigation results clearly, naturally, and empathetically.

Write like a thoughtful human guide, not a software tool.

Goals:
- reassure the user without overpromising
- explain why the suggested areas make sense
- integrate behavior patterns naturally
- weave in one light intuitive signal
- give a practical search order
- make the advice feel specific to the item
- end with calm encouragement

Do:
- use phrases like "signals suggest", "retrace your steps", "many recovery cases", "intuitive signal", "a common recovery pattern", and "in similar cases"
- sound calm, practical, confident, lightly mystical, and human
- keep the advice concrete and usable
- mention likely surfaces, containers, corners, folds, and handoff points in plain language
- vary your wording naturally so the report does not feel repetitive
- include item-specific coaching such as charging areas for earbuds, checkout counters for wallets, sink or laundry zones for rings, travel sleeves for passports, and couch cushions or bedside tables for glasses
- when the item is a ring, jewelry, passport, or wallet, sound a little more reassuring and steady
- end every report with one short encouraging sentence
- use engineResult.searchPriority as the source of truth for the primary search zones and their order
- use engineResult.topDirections as the source of truth
- use engineResult.confidenceScore as the source of truth
- keep Hidden Spots To Check anchored to the engine environmental clues
- explain the investigation clearly without recalculating it

Do not:
- return JSON
- repeat field names or raw engine labels
- dump scores
- list engine outputs
- add new primary search zones
- change the priority order
- change topDirections
- change confidence
- make a fresh judgment about where the item is
- mention fortune telling, divination, astrology, psychic powers, guarantees, or prediction
- promise the item will be found

Return only a markdown report with exactly these sections:

## Most Likely Area

## Why This Makes Sense

## Recommended Search Order

## Hidden Spots To Check

## Intuitive Signal

## If It Is Not There`;

const DEBUG_OPENROUTER = process.env.DEBUG_OPENROUTER === "true";

function normalizeReportSections(value: Partial<ReportSections>): ReportSections | null {
  if (
    typeof value.mostLikelyArea !== "string" ||
    !Array.isArray(value.prioritySearchOrder) ||
    !Array.isArray(value.hiddenSpots) ||
    typeof value.wisdomSignal !== "string" ||
    typeof value.whyThisMakesSense !== "string" ||
    typeof value.ifNotFound !== "string"
  ) {
    return null;
  }

  return {
    mostLikelyArea: value.mostLikelyArea.trim(),
    prioritySearchOrder: value.prioritySearchOrder
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean),
    hiddenSpots: value.hiddenSpots
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean),
    wisdomSignal: value.wisdomSignal.trim(),
    whyThisMakesSense: value.whyThisMakesSense.trim(),
    ifNotFound: value.ifNotFound.trim()
  };
}

function safeParseJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function sentenceList(values: string[], limit: number): string {
  const items = values.map((value) => value.trim()).filter(Boolean).slice(0, limit);

  if (items.length === 0) {
    return "";
  }
  if (items.length === 1) {
    return items[0];
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function buildFallbackSections(analysis: LocalAnalysis): ReportSections {
  const engine = analysis.investigationEngine;
  const mapped = analysis.searchPlan;

  return {
    mostLikelyArea: mapped.mostLikelyArea,
    prioritySearchOrder: mapped.prioritySearchOrder,
    hiddenSpots: mapped.hiddenSpots,
    whyThisMakesSense: mapped.whyThisMakesSense,
    wisdomSignal: mapped.wisdomSignal,
    ifNotFound: mapped.ifNotFound
  };
}

function buildFallbackReport(
  analysis: LocalAnalysis,
  diagnostics?: NarrationResult["diagnostics"]
): NarrationResult {
  return {
    diagnostics,
    usedFallback: true,
    report: buildFallbackSections(analysis)
  };
}

function buildNarratorPayload(analysis: LocalAnalysis): string {
  return analysis.investigationEngine.promptContext;
}

function enforceEngineReport(analysis: LocalAnalysis, report: ReportSections): ReportSections {
  const engineReport = analysis.searchPlan;

  return {
    mostLikelyArea: engineReport.mostLikelyArea,
    prioritySearchOrder: engineReport.prioritySearchOrder,
    hiddenSpots: engineReport.hiddenSpots,
    wisdomSignal: engineReport.wisdomSignal,
    whyThisMakesSense: engineReport.whyThisMakesSense,
    ifNotFound: engineReport.ifNotFound
  };
}

function extractSection(markdown: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`## ${escaped}\\s*([\\s\\S]*?)(?=\\n## |$)`, "i");
  const match = markdown.match(pattern);
  return match?.[1]?.trim() ?? "";
}

function parseListSection(section: string): string[] {
  const lines = section
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines
    .map((line) => line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "").trim())
    .filter(Boolean);
}

function parseMarkdownReport(markdown: string): ReportSections | null {
  const mostLikelyArea = extractSection(markdown, "Most Likely Area");
  const whyThisMakesSense = extractSection(markdown, "Why This Makes Sense");
  const recommendedSearchOrder = extractSection(markdown, "Recommended Search Order");
  const hiddenSpots = extractSection(markdown, "Hidden Spots To Check");
  const intuitiveSignal = extractSection(markdown, "Intuitive Signal");
  const ifNotFound = extractSection(markdown, "If It Is Not There");

  const parsed = normalizeReportSections({
    mostLikelyArea,
    prioritySearchOrder: parseListSection(recommendedSearchOrder),
    hiddenSpots: parseListSection(hiddenSpots),
    wisdomSignal: intuitiveSignal,
    whyThisMakesSense,
    ifNotFound
  });

  if (!parsed) {
    return null;
  }

  if (parsed.prioritySearchOrder.length === 0 || parsed.hiddenSpots.length === 0) {
    return null;
  }

  return parsed;
}

export function buildNarratorRequest(model: string, analysis: LocalAnalysis): RequestInit {
  return {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY ?? ""}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://wherewasit.ai",
      "X-Title": "WhereWasIt.ai"
    },
    body: JSON.stringify({
      model,
      temperature: 0.75,
      messages: [
        {
          role: "system",
          content: NARRATOR_SYSTEM_PROMPT
        },
        {
          role: "user",
          content: buildNarratorPayload(analysis)
        }
      ]
    })
  };
}

export function renderReportMarkdown(report: ReportSections): string {
  const searchOrder = report.prioritySearchOrder.map((step) => `- ${step}`).join("\n");
  const hiddenSpots = report.hiddenSpots.map((spot) => `- ${spot}`).join("\n");

  return [
    "## Most Likely Area",
    report.mostLikelyArea,
    "",
    "## Why This Makes Sense",
    report.whyThisMakesSense,
    "",
    "## Recommended Search Order",
    searchOrder,
    "",
    "## Hidden Spots To Check",
    hiddenSpots,
    "",
    "## Intuitive Signal",
    report.wisdomSignal,
    "",
    "## If It Is Not There",
    report.ifNotFound
  ].join("\n");
}

export async function narrateWithModel(
  analysis: LocalAnalysis,
  model: string
): Promise<NarrationResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return buildFallbackReport(analysis, {
      model,
      statusCode: null,
      responseBodyOnFailure: null,
      errorMessage: null,
      fallbackReason: "OPENROUTER_API_KEY is not set.",
      debugResponse: DEBUG_OPENROUTER ? { note: "Request not attempted without API key." } : undefined
    });
  }

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      buildNarratorRequest(model, analysis)
    );
    const statusCode = response.status;
    const rawText = await response.text();
    const parsedResponse = safeParseJson(rawText) as
      | {
          choices?: Array<{ message?: { content?: string } }>;
          error?: { message?: string };
        }
      | null;

    if (!response.ok) {
      return buildFallbackReport(analysis, {
        model,
        statusCode,
        responseBodyOnFailure: rawText,
        errorMessage: parsedResponse?.error?.message ?? response.statusText ?? null,
        fallbackReason: `OpenRouter returned a non-OK status (${statusCode}).`,
        debugResponse: DEBUG_OPENROUTER ? parsedResponse ?? rawText : undefined
      });
    }

    const content = parsedResponse?.choices?.[0]?.message?.content;
    if (!content) {
      return buildFallbackReport(analysis, {
        model,
        statusCode,
        responseBodyOnFailure: rawText,
        errorMessage: "OpenRouter response did not include message content.",
        fallbackReason: "The model response did not contain a usable narration payload.",
        debugResponse: DEBUG_OPENROUTER ? parsedResponse ?? rawText : undefined
      });
    }

    const parsed = parseMarkdownReport(content);
    if (!parsed) {
      return buildFallbackReport(analysis, {
        model,
        statusCode,
        responseBodyOnFailure: rawText,
        errorMessage: "OpenRouter returned content, but the markdown sections could not be parsed.",
        fallbackReason: "The narration did not follow the required search coach section format.",
        debugResponse: DEBUG_OPENROUTER ? parsedResponse ?? rawText : undefined
      });
    }

    return {
      diagnostics: {
        model,
        statusCode,
        responseBodyOnFailure: null,
        errorMessage: null,
        fallbackReason: null,
        debugResponse: DEBUG_OPENROUTER ? parsedResponse ?? rawText : undefined
      },
      usedFallback: false,
      report: enforceEngineReport(analysis, parsed)
    };
  } catch (error) {
    return buildFallbackReport(analysis, {
      model,
      statusCode: null,
      responseBodyOnFailure: null,
      errorMessage: error instanceof Error ? error.message : "Unknown OpenRouter error.",
      fallbackReason: "The OpenRouter request threw before a usable response was returned.",
      debugResponse: DEBUG_OPENROUTER ? { thrown: error instanceof Error ? error.stack ?? error.message : error } : undefined
    });
  }
}

export async function aiNarrator(analysis: LocalAnalysis): Promise<NarrationResult> {
  return narrateWithModel(analysis, "deepseek/deepseek-chat");
}
