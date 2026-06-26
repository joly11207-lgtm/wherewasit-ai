"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";

import { SimpleSelect, SimpleSelectOption } from "@/components/SimpleSelect";
import { trackEvent } from "@/lib/analytics";
import { LocalAnalysis, OptionalDetailInputs, ReportSections } from "@/lib/types";

type AnalyzeResponse = {
  analysis: LocalAnalysis;
  report: ReportSections;
  usedFallback: boolean;
  error?: string;
};

type FeedbackState = "found_it" | "not_yet" | null;

const examplePrompts = [
  {
    label: "AirPods",
    value: "I lost my AirPods. I last used them in my bedroom this morning, then drove to work."
  },
  {
    label: "Wedding Ring",
    value:
      "I misplaced my wedding ring. I took it off in the bathroom before showering, then changed clothes in the bedroom."
  },
  {
    label: "Wallet",
    value:
      "I can't find my wallet. I used it at the grocery store, drove home, carried bags inside, and dropped things on the kitchen counter."
  }
];

const OTHER_OPTION = "__other__";

const itemTypeOptions = [
  "Keys",
  "Wallet",
  "Phone",
  "AirPods / Earbuds",
  "Ring / Jewelry",
  "Passport / Documents",
  "Glasses",
  "Bag / Backpack",
  "Other..."
];

const itemSelectOptions: SimpleSelectOption[] = itemTypeOptions.map((option) => ({
  value: option === "Other..." ? OTHER_OPTION : option,
  label: option
}));

const placeOptions = [
  "Home",
  "Bedroom",
  "Bathroom",
  "Kitchen",
  "Car",
  "Work / Office",
  "School",
  "Store",
  "Hotel / Travel",
  "Outside",
  "Not sure",
  "Other..."
];

const placeSelectOptions: SimpleSelectOption[] = placeOptions.map((option) => ({
  value: option === "Other..." ? OTHER_OPTION : option,
  label: option
}));

const dateOptions = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "pick_date", label: "Pick a date" },
  { value: "not_sure", label: "Not sure" }
];

const dateSelectOptions: SimpleSelectOption[] = dateOptions.map((option) => ({
  value: option.value,
  label: option.label
}));

const timeOptions = [
  { value: "early_morning", label: "Early morning (5-8)" },
  { value: "morning", label: "Morning (8-12)" },
  { value: "afternoon", label: "Afternoon (12-5)" },
  { value: "evening", label: "Evening (5-9)" },
  { value: "night", label: "Night (9-12)" },
  { value: "late_night", label: "Late night (12-5)" },
  { value: "approximate_hour", label: "Approximate hour" },
  { value: "not_sure", label: "Not sure" }
];

const timeSelectOptions: SimpleSelectOption[] = timeOptions.map((option) => ({
  value: option.value,
  label: option.label
}));

const hourOptions = [
  "1 AM",
  "2 AM",
  "3 AM",
  "4 AM",
  "5 AM",
  "6 AM",
  "7 AM",
  "8 AM",
  "9 AM",
  "10 AM",
  "11 AM",
  "12 PM",
  "1 PM",
  "2 PM",
  "3 PM",
  "4 PM",
  "5 PM",
  "6 PM",
  "7 PM",
  "8 PM",
  "9 PM",
  "10 PM",
  "11 PM",
  "12 AM"
];

const loadingSteps = [
  "Analyzing your timeline...",
  "Checking habit patterns...",
  "Looking for overlooked places...",
  "Preparing your search plan..."
];

const fieldClassName =
  "mt-2 block h-14 w-full rounded-[16px] border border-[rgba(214,168,79,0.22)] bg-[rgba(0,0,0,0.48)] px-5 font-body text-base text-[#f5ead2] outline-none transition focus:border-[rgba(214,168,79,0.72)] focus:bg-[rgba(0,0,0,0.62)] focus:ring-4 focus:ring-[rgba(214,168,79,0.08)]";

function formatDetailTime(details: OptionalDetailInputs): string | null {
  const timeLabels: Record<string, string> = {
    early_morning: "early morning",
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night",
    late_night: "late night"
  };

  if (details.selectedTimeMode === "approximate_hour") {
    return details.selectedHour?.trim() || null;
  }

  if (!details.selectedTimeMode || details.selectedTimeMode === "not_sure") {
    return null;
  }

  return timeLabels[details.selectedTimeMode] ?? null;
}

function formatDetailDate(details: OptionalDetailInputs): string | null {
  if (details.selectedDateMode === "today") {
    return "today";
  }

  if (details.selectedDateMode === "yesterday") {
    return "yesterday";
  }

  if (details.selectedDateMode === "pick_date") {
    return details.selectedDate?.trim() || null;
  }

  return null;
}

function buildStructuredStory({
  selectedItemType,
  selectedPlace,
  details
}: {
  selectedItemType?: string;
  selectedPlace?: string;
  details: OptionalDetailInputs;
}): string {
  const item = selectedItemType?.trim() || "item";
  const parts = [`I lost my ${item}.`];

  if (selectedPlace?.trim()) {
    parts.push(`The last known place was ${selectedPlace.trim()}.`);
  }

  const time = formatDetailTime(details);
  const date = formatDetailDate(details);

  if (date && time) {
    parts.push(`It was around ${time} on ${date}.`);
  } else if (time) {
    parts.push(`It was around ${time}.`);
  } else if (date) {
    parts.push(`This happened ${date}.`);
  }

  return parts.join(" ");
}

function LoadingState() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveStep((current) => Math.min(current + 1, loadingSteps.length - 1));
    }, 900);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="mystery-card mx-auto w-full max-w-[980px] p-[18px] sm:p-[34px]">
      <div className="panel-inner">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow-text">Tracing Clues</p>
          <h2 className="mt-4 font-display text-3xl text-[#f5ead2] sm:text-4xl">
            Building your search plan
          </h2>
          <p className="reference-subtitle mt-4 text-base sm:text-lg">
            We are retracing your route, weighing habit patterns, and narrowing overlooked places.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-2xl space-y-3">
          {loadingSteps.map((step, index) => {
            const isComplete = index < activeStep;
            const isActive = index === activeStep;

            return (
              <div
                key={step}
                className={`flex items-center gap-3 rounded-[16px] border px-4 py-4 transition ${
                  isActive
                    ? "border-[rgba(214,168,79,0.32)] bg-[rgba(214,168,79,0.12)] text-[#f8edd8]"
                    : isComplete
                      ? "border-[rgba(214,168,79,0.18)] bg-[rgba(214,168,79,0.07)] text-[#e7d3a9]"
                      : "border-[rgba(214,168,79,0.12)] bg-[rgba(255,255,255,0.02)] text-[#90866d]"
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-semibold uppercase tracking-[0.18em] ${
                    isActive
                      ? "border-[rgba(255,240,212,0.35)] bg-[rgba(255,240,212,0.08)]"
                      : isComplete
                        ? "border-[rgba(214,168,79,0.26)] bg-[rgba(214,168,79,0.1)]"
                        : "border-[rgba(214,168,79,0.14)] bg-[rgba(255,255,255,0.02)]"
                  }`}
                >
                  {isComplete ? "Done" : isActive ? "Now" : `${index + 1}`}
                </div>
                <p className="font-body text-sm sm:text-base">{step}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ResultCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mystery-card p-6 sm:p-7">
      <div className="panel-inner-soft">
        <h3 className="eyebrow-text text-[11px] text-[#d4af6e]">{title}</h3>
        <div className="mt-4 font-body text-[#efe4c8]">{children}</div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const [input, setInput] = useState("");
  const [report, setReport] = useState<ReportSections | null>(null);
  const [analysis, setAnalysis] = useState<LocalAnalysis | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<FeedbackState>(null);
  const [showAdvancedAnalysis, setShowAdvancedAnalysis] = useState(false);
  const [storyExpanded, setStoryExpanded] = useState(false);
  const [customItemType, setCustomItemType] = useState("");
  const [customPlace, setCustomPlace] = useState("");
  const [details, setDetails] = useState<OptionalDetailInputs>({});

  const hasResult = Boolean(report);
  const hasStory = input.trim().length > 0;
  const isStoryExpanded = storyExpanded || hasStory;

  const introCopy = useMemo(() => {
    if (hasResult) {
      return "Your search plan is ready. Start with the nearest likely area and widen from there only if needed.";
    }

    return "We'll help you retrace the clues.";
  }, [hasResult]);

  useEffect(() => {
    if (report && analysis) {
      trackEvent("analysis_report_viewed", {
        itemCategory: analysis.itemCategory,
        usedFallback
      });
    }
  }, [report, analysis, usedFallback]);

  function updateDetail<K extends keyof OptionalDetailInputs>(
    key: K,
    value: OptionalDetailInputs[K]
  ) {
    setDetails((current) => ({ ...current, [key]: value }));
  }

  function handleExampleClick(example: string, label: string) {
    setInput(example);
    setStoryExpanded(true);
    setError(null);
    trackEvent("example_prompt_selected", { example: label });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsLoading(true);
    setError(null);
    setUsedFallback(false);
    setFeedbackState(null);
    setShowAdvancedAnalysis(false);

    const selectedItemType =
      details.selectedItemType === OTHER_OPTION
        ? customItemType.trim() || undefined
        : details.selectedItemType;

    const selectedPlace =
      details.selectedPlace === OTHER_OPTION ? customPlace.trim() || undefined : details.selectedPlace;

    const usedOptionalDetails = Boolean(
      selectedItemType ||
        selectedPlace ||
        (details.selectedDateMode && details.selectedDateMode !== "not_sure") ||
        (details.selectedTimeMode && details.selectedTimeMode !== "not_sure")
    );

    const submissionInput = input.trim()
      ? input.trim()
      : usedOptionalDetails
        ? buildStructuredStory({
            selectedItemType,
            selectedPlace,
            details
          })
        : "";

    if (!submissionInput) {
      setIsLoading(false);
      setError("Add your story or a few details first so we can retrace the clues with you.");
      return;
    }

    trackEvent("analysis_started", {
      inputLength: submissionInput.length,
      usedOptionalDetails
    });

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          input: submissionInput,
          ...details,
          selectedItemType,
          selectedPlace
        })
      });

      const data = (await response.json()) as AnalyzeResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error ?? "Unable to analyze the clues right now.");
      }

      setReport(data.report);
      setAnalysis(data.analysis);
      setUsedFallback(data.usedFallback);
      trackEvent("analysis_succeeded", {
        itemCategory: data.analysis.itemCategory,
        usedFallback: data.usedFallback
      });
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to analyze the clues right now.";

      setError(message);
      setReport(null);
      setAnalysis(null);
      setUsedFallback(false);
      trackEvent("analysis_failed", { message });
    } finally {
      setIsLoading(false);
    }
  }

  function handleFeedback(nextState: Exclude<FeedbackState, null>) {
    setFeedbackState(nextState);
    trackEvent("report_feedback_submitted", {
      feedback: nextState,
      itemCategory: analysis?.itemCategory ?? "unknown"
    });
  }

  function handleReset() {
    setInput("");
    setReport(null);
    setAnalysis(null);
    setError(null);
    setIsLoading(false);
    setUsedFallback(false);
    setFeedbackState(null);
    setShowAdvancedAnalysis(false);
    setStoryExpanded(false);
    setCustomItemType("");
    setCustomPlace("");
    setDetails({});
    trackEvent("new_search_started");
  }

  return (
    <main className="reference-page relative overflow-hidden px-5 py-7 sm:px-6 md:px-10 md:py-10">
      <div className="relative mx-auto flex min-h-[calc(100vh-8rem)] max-w-[980px] flex-col justify-center">
        <section className="space-y-5">
          <div className="hero-stack mx-auto max-w-3xl text-center">
            <p className="eyebrow-text">WhereWasIt.ai</p>
            <h1 className="hero-title mt-3 font-display">
              Lost something?
            </h1>
            <p className="reference-subtitle mx-auto mt-4 max-w-xl text-center">
              {introCopy}
            </p>
          </div>

          {isLoading ? (
            <LoadingState />
          ) : hasResult && report ? (
            <div className="mx-auto w-full max-w-[980px] space-y-4 sm:space-y-5">
              <section className="mystery-card p-6 sm:p-8">
                <div className="panel-inner-soft">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="eyebrow-text text-[11px] text-[#b69256]">Search Plan Ready</p>
                      <h2 className="mt-3 font-display text-3xl text-[#f5ead2] sm:text-4xl">
                        Most Likely Area
                      </h2>
                      <p className="mt-3 font-display text-2xl leading-tight text-[#d6a84f] sm:text-3xl">
                        {report.mostLikelyArea}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {usedFallback ? (
                        <span className="rounded-full border border-[rgba(214,168,79,0.18)] bg-[rgba(214,168,79,0.08)] px-3 py-2 font-body text-xs uppercase tracking-[0.2em] text-[#d6a84f]">
                          Template fallback
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={handleReset}
                        className="rounded-full border border-[rgba(214,168,79,0.18)] bg-[rgba(0,0,0,0.42)] px-4 py-2 font-body text-sm font-semibold text-[#efe4c8] transition hover:border-[rgba(214,168,79,0.34)] hover:bg-[rgba(214,168,79,0.08)]"
                      >
                        New Search
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <ResultCard title="Why This Makes Sense">
                <p className="leading-8 text-[#e9dfc6]">{report.whyThisMakesSense}</p>
              </ResultCard>

              <ResultCard title="Recommended Search Order">
                <ol className="space-y-3">
                  {report.prioritySearchOrder.map((step, index) => (
                    <li
                      key={`${index}-${step}`}
                      className="flex items-start gap-3 rounded-[1.35rem] border border-[rgba(212,175,110,0.14)] bg-[rgba(255,255,255,0.02)] px-4 py-4"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[rgba(212,175,110,0.2)] bg-[rgba(212,175,110,0.12)] text-xs font-semibold text-[#f3e6c8]">
                        {index + 1}
                      </span>
                      <span className="leading-7 text-[#e9dfc6]">{step}</span>
                    </li>
                  ))}
                </ol>
              </ResultCard>

              <ResultCard title="Hidden Spots To Check">
                <div className="flex flex-wrap gap-2">
                  {report.hiddenSpots.map((spot) => (
                    <span
                      key={spot}
                      className="rounded-full border border-[rgba(212,175,110,0.16)] bg-[rgba(212,175,110,0.07)] px-3 py-2 text-sm text-[#e8ddc4]"
                    >
                      {spot}
                    </span>
                  ))}
                </div>
              </ResultCard>

              <ResultCard title="Intuitive Signal">
                <p className="leading-8 text-[#e9dfc6]">{report.wisdomSignal}</p>
              </ResultCard>

              <ResultCard title="If It Is Not There">
                <p className="leading-8 text-[#e9dfc6]">{report.ifNotFound}</p>
              </ResultCard>

              <section className="mystery-card p-6 sm:p-7">
                <div className="panel-inner-soft">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="eyebrow-text text-[11px] text-[#d4af6e]">Found It?</p>
                      <p className="mt-2 font-body text-sm leading-7 text-[#c1b69d]">
                        Your feedback helps us improve the public alpha search coach.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleFeedback("found_it")}
                        className={`rounded-full px-4 py-2 font-body text-sm font-semibold transition ${
                          feedbackState === "found_it"
                            ? "border border-[rgba(214,168,79,0.26)] bg-[linear-gradient(135deg,rgba(181,136,55,0.55),rgba(111,82,30,0.75))] text-[#fff6e5]"
                            : "border border-[rgba(214,168,79,0.18)] bg-[rgba(0,0,0,0.42)] text-[#efe4c8] hover:bg-[rgba(214,168,79,0.08)]"
                        }`}
                      >
                        Yes, found it
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFeedback("not_yet")}
                        className={`rounded-full px-4 py-2 font-body text-sm font-semibold transition ${
                          feedbackState === "not_yet"
                            ? "border border-[rgba(214,168,79,0.18)] bg-[rgba(132,83,42,0.55)] text-[#fff2dc]"
                            : "border border-[rgba(214,168,79,0.18)] bg-[rgba(0,0,0,0.42)] text-[#d8bf93] hover:bg-[rgba(214,168,79,0.08)]"
                        }`}
                      >
                        Not yet
                      </button>
                    </div>
                  </div>

                  {feedbackState ? (
                    <p className="mt-4 font-body text-sm leading-7 text-[#c1b69d]">
                      {feedbackState === "found_it"
                        ? "That is great to hear. Thanks for helping us learn what works."
                        : "Thanks for the signal. We will use it to improve the next search pass."}
                    </p>
                  ) : null}
                </div>
              </section>

              <details
                className="mystery-card p-5"
                open={showAdvancedAnalysis}
                onToggle={(event) => {
                  const nextOpen = (event.currentTarget as HTMLDetailsElement).open;
                  setShowAdvancedAnalysis(nextOpen);
                  trackEvent("advanced_analysis_toggled", { open: nextOpen });
                }}
              >
                <summary className="cursor-pointer list-none font-body text-sm font-semibold uppercase tracking-[0.2em] text-[#d4af6e]">
                  Advanced analysis
                </summary>

                {analysis ? (
                  <div className="panel-inner-soft mt-5 space-y-5 font-body text-sm leading-7 text-[#c7bb9f]">
                    <div>
                      <p className="uppercase tracking-[0.24em] text-[#a98b56]">Extracted</p>
                      <p className="mt-2">
                        <strong className="text-[#efe4c8]">Item:</strong> {analysis.input.itemType}
                        <br />
                        <strong className="text-[#efe4c8]">Category:</strong> {analysis.itemCategory}
                        <br />
                        <strong className="text-[#efe4c8]">Last seen:</strong>{" "}
                        {analysis.input.lastSeenLocation}
                        <br />
                        <strong className="text-[#efe4c8]">Time:</strong> {analysis.input.lastSeenTime}
                        <br />
                        <strong className="text-[#efe4c8]">Gap:</strong>{" "}
                        {analysis.memory.timeGapLabel}
                      </p>
                    </div>

                    <div>
                      <p className="uppercase tracking-[0.24em] text-[#a98b56]">Transition moments</p>
                      <p className="mt-2">
                        {analysis.memory.transitionMoments.length > 0
                          ? analysis.memory.transitionMoments.join(", ")
                          : "No major transition moments detected"}
                      </p>
                    </div>

                    <div>
                      <p className="uppercase tracking-[0.24em] text-[#a98b56]">Top local signals</p>
                      <ul className="mt-2 space-y-2">
                        {analysis.probabilities.slice(0, 3).map((entry) => (
                          <li
                            key={entry.location}
                            className="rounded-2xl border border-[rgba(212,175,110,0.12)] bg-[rgba(255,255,255,0.02)] px-4 py-3"
                          >
                            <strong className="text-[#efe4c8]">{entry.location}</strong> ({entry.score}
                            /100): {entry.reasons[0]}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : null}
              </details>
            </div>
          ) : (
            <section className="mystery-card mystery-card--floating mx-auto w-full max-w-[980px] p-[18px] sm:p-[34px]">
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="panel-inner">
                  <p className="form-hint">
                    These details are optional, but they can help us narrow the search.
                  </p>
                  <p className="form-hint form-hint-strong">Your story is still the most important clue.</p>

                  <div className="field-grid mt-4">
                    <div className="block">
                      <span className="block eyebrow-text text-[11px] text-[#b69256]">Item</span>
                      <SimpleSelect
                        value={details.selectedItemType ?? ""}
                        onValueChange={(value) => {
                          updateDetail("selectedItemType", value);
                          if (value !== OTHER_OPTION) {
                            setCustomItemType("");
                          }
                        }}
                        options={itemSelectOptions}
                        placeholder="Select an item..."
                        ariaLabel="Select an item"
                      />
                      {details.selectedItemType === OTHER_OPTION ? (
                        <input
                          type="text"
                          value={customItemType}
                          onChange={(event) => setCustomItemType(event.target.value)}
                          placeholder="Type your item"
                          className={fieldClassName}
                        />
                      ) : null}
                    </div>

                    <div className="block">
                      <span className="block eyebrow-text text-[11px] text-[#b69256]">Last known place</span>
                      <SimpleSelect
                        value={details.selectedPlace ?? ""}
                        onValueChange={(value) => {
                          updateDetail("selectedPlace", value);
                          if (value !== OTHER_OPTION) {
                            setCustomPlace("");
                          }
                        }}
                        options={placeSelectOptions}
                        placeholder="Select a place..."
                        ariaLabel="Select a place"
                      />
                      {details.selectedPlace === OTHER_OPTION ? (
                        <input
                          type="text"
                          value={customPlace}
                          onChange={(event) => setCustomPlace(event.target.value)}
                          placeholder="Type a place"
                          className={fieldClassName}
                        />
                      ) : null}
                    </div>

                    <div className="block">
                      <span className="block eyebrow-text text-[11px] text-[#b69256]">Approximate time</span>
                      <SimpleSelect
                        value={details.selectedTimeMode ?? ""}
                        onValueChange={(value) =>
                          updateDetail(
                            "selectedTimeMode",
                            value as OptionalDetailInputs["selectedTimeMode"]
                          )
                        }
                        options={timeSelectOptions}
                        placeholder="Select a time..."
                        ariaLabel="Select a time"
                      />
                      {details.selectedTimeMode === "approximate_hour" ? (
                        <select
                          value={details.selectedHour ?? ""}
                          onChange={(event) => updateDetail("selectedHour", event.target.value)}
                          aria-label="Choose an hour"
                          className={fieldClassName}
                        >
                          <option value="">Choose an hour...</option>
                          {hourOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : null}
                    </div>

                    <div className="block">
                      <span className="block eyebrow-text text-[11px] text-[#b69256]">Date (optional)</span>
                      <SimpleSelect
                        value={details.selectedDateMode ?? ""}
                        onValueChange={(value) =>
                          updateDetail(
                            "selectedDateMode",
                            value as OptionalDetailInputs["selectedDateMode"]
                          )
                        }
                        options={dateSelectOptions}
                        placeholder="Select a date..."
                        ariaLabel="Select a date"
                      />
                      {details.selectedDateMode === "pick_date" ? (
                        <input
                          type="date"
                          value={details.selectedDate ?? ""}
                          onChange={(event) => updateDetail("selectedDate", event.target.value)}
                          className={fieldClassName}
                        />
                      ) : null}
                    </div>
                  </div>

                  <div className="story-block mt-2">
                    {isStoryExpanded ? (
                      <label className="block">
                        <span className="eyebrow-text text-[11px] text-[#b69256]">
                          Tell us what happened
                        </span>
                        <p className="mt-2 font-body text-sm leading-7 text-[#cdbfa5]">
                          Add your story in your own words. This is the most important clue.
                        </p>
                        <textarea
                          className="mt-3 min-h-[150px] w-full resize-y rounded-[16px] border border-[rgba(214,168,79,0.24)] bg-[rgba(10,9,7,0.58)] px-5 py-[17px] font-body text-base leading-[1.65] text-[#fbf1dc] shadow-[0_0_0_1px_rgba(214,168,79,0.03),0_24px_70px_rgba(0,0,0,0.32)] outline-none transition placeholder:text-[rgba(245,234,210,0.58)] focus:border-[rgba(214,168,79,0.78)] focus:bg-[rgba(8,7,5,0.72)] focus:ring-4 focus:ring-[rgba(214,168,79,0.1)] disabled:cursor-not-allowed disabled:opacity-70"
                          value={input}
                          onChange={(event) => setInput(event.target.value)}
                          disabled={isLoading}
                          placeholder={`Where did you last remember using it?\nWhat happened next?\nAnything unusual you remember?`}
                        />
                      </label>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setStoryExpanded(true)}
                        className="story-collapsed-card w-full text-left"
                      >
                        <span className="eyebrow-text text-[11px] text-[#b69256]">
                          Tell us what happened
                        </span>
                        <p className="mt-2 font-body text-sm leading-7 text-[#cdbfa5]">
                          Add your story in your own words. This is the most important clue.
                        </p>
                        <span className="story-collapsed-action mt-4 inline-flex items-center rounded-full px-4 py-2 font-body text-sm font-semibold">
                          Write story
                        </span>
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="gold-button mt-[30px] block w-full max-w-[420px] rounded-[16px] px-7 py-[18px] font-body text-[15px] font-bold uppercase tracking-[0.22em] text-[#1a1206] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Find My Item
                  </button>

                  <div className="examples-row mt-[10px]">
                    {examplePrompts.map((example) => (
                      <button
                        key={example.label}
                        type="button"
                        onClick={() => handleExampleClick(example.value, example.label)}
                        className="reference-chip"
                      >
                        {example.label}
                      </button>
                    ))}
                  </div>
                </div>
              </form>

              {error ? (
                <div className="mt-5 rounded-[1.5rem] border border-[rgba(164,90,48,0.28)] bg-[rgba(94,39,14,0.26)] px-5 py-4">
                  <p className="eyebrow-text text-[11px] text-[#dca76d]">We hit a snag</p>
                  <p className="mt-2 font-body text-sm leading-7 text-[#ecd9bb]">
                    {error} Try shortening the story to the last confirmed moment, then the next
                    place you went.
                  </p>
                </div>
              ) : null}

              <div className="mt-6 text-center font-body text-sm leading-7 text-[#8e846e]">
                <p>No login, no payment, and no saved history in this public alpha version.</p>
                <p className="mt-2">
                  Review our{" "}
                  <Link
                    href="/privacy"
                    className="text-[#d4af6e] underline decoration-[rgba(212,175,110,0.35)] underline-offset-4"
                    onClick={() => trackEvent("inline_link_clicked", { href: "/privacy" })}
                  >
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/terms"
                    className="text-[#d4af6e] underline decoration-[rgba(212,175,110,0.35)] underline-offset-4"
                    onClick={() => trackEvent("inline_link_clicked", { href: "/terms" })}
                  >
                    Terms
                  </Link>
                  .
                </p>
              </div>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
