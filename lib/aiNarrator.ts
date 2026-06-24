import { LocalAnalysis, NarrationResult, ReportSections } from "@/lib/types";

const NARRATOR_SYSTEM_PROMPT = `You are a calm, reassuring, practical Lost Item Search Coach.

Your job is to turn a local lost-item analysis into a helpful search experience for an English-speaking user in natural American English.

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

Do not:
- return JSON
- repeat field names or raw engine labels
- dump scores
- list engine outputs
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

function getItemCoachNotes(analysis: LocalAnalysis): {
  specificPlaces: string[];
  recoveryPattern: string;
  toneInstruction: string;
  reassuranceLine: string;
  encouragingClose: string;
} {
  const category = analysis.itemCategory;
  const itemName = analysis.input.itemType;

  switch (category) {
    case "audio":
      return {
        specificPlaces: ["charging areas", "bedding", "hoodie pockets", "work bags", "seat gaps"],
        recoveryPattern: `Many recovered ${itemName} are found much closer to the last everyday routine than expected, especially near charging spots, fabric, or the pocket used during the next transition.`,
        toneInstruction:
          "Keep the tone calm and grounded, with practical attention to small covered spaces.",
        reassuranceLine:
          "Slow the search down and give the close-in spots one careful pass before assuming they traveled farther.",
        encouragingClose: "Many items turn up closer than expected."
      };
    case "wallet":
      return {
        specificPlaces: ["checkout counters", "jacket pockets", "car console", "grocery bags", "entry tables"],
        recoveryPattern:
          "A common recovery pattern for wallets is that they stay with the last carry spot or get set down during unloading after an errand.",
        toneInstruction:
          "Use a steadier, more reassuring tone because losing a wallet can feel urgent.",
        reassuranceLine:
          "If this is starting to feel urgent, keep the search methodical and stay with the first two locations before widening out.",
        encouragingClose: "Take one careful pass before assuming it is gone."
      };
    case "jewelry":
      return {
        specificPlaces: ["sink edges", "bathroom counters", "laundry baskets", "dresser tops", "towel folds"],
        recoveryPattern:
          "In similar cases, jewelry is often recovered near washing, changing clothes, or fabric piles rather than far from home.",
        toneInstruction:
          "Use a gentle, reassuring tone because the item may be sentimental.",
        reassuranceLine:
          "Take this part slowly because sentimental items are often found in a quiet, ordinary spot rather than a dramatic one.",
        encouragingClose: "Most recoveries happen during a calm second search."
      };
    case "documents":
      return {
        specificPlaces: ["travel bags", "document sleeves", "desk drawers", "paper stacks", "jacket pockets"],
        recoveryPattern:
          "A common recovery pattern for passports and documents is that they end up inside another travel layer or under a flat paper stack.",
        toneInstruction:
          "Use a more reassuring tone because missing travel documents can raise stress quickly.",
        reassuranceLine:
          "If your nerves are rising, pause and search the flat paper areas and travel layers slowly before jumping to the worst conclusion.",
        encouragingClose: "A steady second pass often finds what the first one missed."
      };
    case "glasses":
      return {
        specificPlaces: ["couch cushions", "bedside tables", "blankets", "dresser corners", "soft cases"],
        recoveryPattern:
          "In similar cases, glasses are often recovered at sitting height, tucked into soft surfaces, or left near the last place someone settled down.",
        toneInstruction:
          "Keep the tone calm and matter-of-fact, with extra focus on soft surfaces and rest spots.",
        reassuranceLine:
          "Search at sitting height first because glasses often disappear into the spaces people relax in.",
        encouragingClose: "Most recoveries happen once the search slows down."
      };
    case "phone":
      return {
        specificPlaces: ["couch cushions", "bedside tables", "blankets", "bathroom ledges", "bag pockets"],
        recoveryPattern:
          "A common recovery pattern for phones is that they slip into soft surfaces or land on the nearest flat edge during multitasking.",
        toneInstruction:
          "Keep the tone steady and practical, with attention to soft surfaces and handoff points.",
        reassuranceLine:
          "Start with the close, soft surfaces before treating this like a wider travel search.",
        encouragingClose: "Take one slow pass before widening the search."
      };
    default:
      return {
        specificPlaces: ["nearby surfaces", "carry spots", "fabric folds", "drawer edges", "bag compartments"],
        recoveryPattern: `In similar cases, ${itemName.toLowerCase()} often turns up near the last routine pause or inside the next place it was carried.`,
        toneInstruction: "Keep the tone warm, practical, and steady.",
        reassuranceLine:
          "A calm second pass usually works better than a fast wide search.",
        encouragingClose: "Many items are found on a careful second look."
      };
  }
}

function itemVerb(itemType: string): "is" | "are" {
  const value = itemType.toLowerCase();
  return /airpods|earbuds|headphones|glasses|keys|documents/.test(value) ? "are" : "is";
}

function buildFallbackReport(
  analysis: LocalAnalysis,
  diagnostics?: NarrationResult["diagnostics"]
): NarrationResult {
  const topArea = analysis.searchPlan.searchSteps[0]?.area ?? analysis.searchPlan.mostLikelyArea;
  const secondArea = analysis.searchPlan.searchSteps[1]?.area;
  const coachNotes = getItemCoachNotes(analysis);

  return {
    diagnostics,
    usedFallback: true,
    report: {
      mostLikelyArea: `Your ${analysis.input.itemType.toLowerCase()} ${itemVerb(analysis.input.itemType)} most likely still near ${topArea.toLowerCase()}.`,
      prioritySearchOrder: analysis.searchPlan.searchSteps.slice(0, 5).map((step, index) => {
        const lead =
          index === 0
            ? `Start with ${step.area.toLowerCase()}`
            : index === 1
              ? `Then move to ${step.area.toLowerCase()}`
              : `After that, check ${step.area.toLowerCase()}`;

        return `${lead} because ${step.reason.toLowerCase()} ${index === 0 ? "This is a common recovery zone when the first memory is still close to the item." : step.instruction}`;
      }),
      hiddenSpots: analysis.searchPlan.hiddenSpots.slice(0, 6),
      wisdomSignal: `${analysis.wisdom.signal} One intuitive signal suggests looking in a partly covered place such as ${coachNotes.specificPlaces
        .slice(0, 2)
        .join(" or ")} before assuming the item moved farther away.`,
      whyThisMakesSense: [
        `The search pattern circles back to ${analysis.input.lastSeenLocation}, then widens toward ${secondArea ? secondArea.toLowerCase() : "the next natural handoff point"} only after the close-in spots are covered.`,
        coachNotes.recoveryPattern,
        `Signals suggest paying attention to ${coachNotes.specificPlaces
          .slice(0, 3)
          .join(", ")} because those are the kinds of places where this item often slips out of notice.`
      ].join(" "),
      ifNotFound: `${coachNotes.reassuranceLine} Retrace your steps once more through the first two areas, then check ${coachNotes.specificPlaces
        .slice(0, 3)
        .join(", ")} before widening the search. ${coachNotes.encouragingClose}`
    }
  };
}

function buildNarratorPayload(analysis: LocalAnalysis): string {
  const coachNotes = getItemCoachNotes(analysis);

  return JSON.stringify(
    {
      item: analysis.input.itemType,
      lastSeenLocation: analysis.input.lastSeenLocation,
      lastSeenTime: analysis.input.lastSeenTime,
      placesVisited: analysis.input.placesVisited,
      emotionalContext: analysis.input.emotionalContext,
      topLikelyAreas: analysis.probabilities.slice(0, 5).map((entry) => ({
        area: entry.location,
        whyItRanksHighly: entry.reasons[0],
        hiddenSpots: entry.hiddenSpots.slice(0, 4)
      })),
      searchOrder: analysis.searchPlan.searchSteps.slice(0, 5).map((step, index) => ({
        step: index + 1,
        area: step.area,
        instruction: step.instruction,
        reason: step.reason
      })),
      intuitiveSignals: {
        wisdomSignal: analysis.wisdom.signal,
        directionHint: analysis.wisdom.directionHint,
        cues: analysis.wisdom.cues
      },
      itemSpecificCoaching: {
        likelyPlacesToWorkIntoTheNarration: coachNotes.specificPlaces,
        recoveryPatternLanguage: coachNotes.recoveryPattern,
        reassuranceTone: coachNotes.toneInstruction,
        encouragingClose: coachNotes.encouragingClose
      },
      searchCoachNotes: {
        handoffRisk: analysis.memory.handoffRisk,
        transitionMoments: analysis.memory.transitionMoments,
        reminder:
          "Do not sound like a report generator. Sound like a trusted search coach guiding one careful search pass."
      }
    },
    null,
    2
  );
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
      report: parsed
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
