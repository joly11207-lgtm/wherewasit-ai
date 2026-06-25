"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

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
    label: "Wedding ring",
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

const dateOptions = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "pick_date", label: "Pick a date" },
  { value: "not_sure", label: "Not sure" }
];

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

function LoadingState() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveStep((current) => Math.min(current + 1, loadingSteps.length - 1));
    }, 900);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="rounded-[2rem] border border-white/70 bg-white/88 p-6 shadow-glow backdrop-blur sm:p-8">
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-body text-xs uppercase tracking-[0.28em] text-pine/60">Tracing Clues</p>
        <h2 className="mt-3 font-display text-3xl text-pine sm:text-4xl">
          Building your search plan
        </h2>
        <p className="mt-3 font-body text-sm leading-7 text-ink/65 sm:text-base">
          We are retracing your steps, weighing routine patterns, and preparing a calm second pass.
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-2xl space-y-3">
        {loadingSteps.map((step, index) => {
          const isComplete = index < activeStep;
          const isActive = index === activeStep;

          return (
            <div
              key={step}
              className={`flex items-center gap-3 rounded-[1.35rem] px-4 py-4 transition ${
                isActive
                  ? "bg-pine text-white"
                  : isComplete
                    ? "bg-pine/8 text-pine"
                    : "bg-[#fffaf3] text-ink/55"
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border font-body text-xs font-semibold uppercase tracking-[0.16em] ${
                  isActive
                    ? "border-white/35 bg-white/15"
                    : isComplete
                      ? "border-pine/15 bg-pine/10"
                      : "border-sand bg-white"
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
  );
}

function ResultCard({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/70 bg-white/82 p-6 shadow-glow backdrop-blur sm:p-7">
      <h3 className="font-body text-sm uppercase tracking-[0.24em] text-ink/55">{title}</h3>
      <div className="mt-4 font-body text-ink/82">{children}</div>
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
  const [customItemType, setCustomItemType] = useState("");
  const [customPlace, setCustomPlace] = useState("");
  const [details, setDetails] = useState<OptionalDetailInputs>({
    selectedDateMode: "not_sure",
    selectedTimeMode: "not_sure"
  });

  const hasResult = Boolean(report);

  const introCopy = useMemo(() => {
    if (hasResult) {
      return "Your search plan is ready. Start with the most likely area first, then widen carefully if needed.";
    }

    return "Describe what happened. We'll help you retrace the clues.";
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
    setError(null);
    trackEvent("example_prompt_selected", { example: label });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!input.trim()) {
      setError("Add a few details first so we can retrace the clues with you.");
      return;
    }

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

    trackEvent("analysis_started", {
      inputLength: input.trim().length,
      usedOptionalDetails
    });

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          input,
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
    setCustomItemType("");
    setCustomPlace("");
    setDetails({
      selectedDateMode: "not_sure",
      selectedTimeMode: "not_sure"
    });
    trackEvent("new_search_started");
  }

  return (
    <main className="relative overflow-hidden px-4 py-6 sm:px-6 md:px-10 md:py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-[#e8ddc9]/45 blur-3xl" />
        <div className="absolute bottom-10 left-0 h-56 w-56 rounded-full bg-[#cfd8c6]/30 blur-3xl" />
        <div className="absolute right-0 top-28 h-64 w-64 rounded-full bg-[#efe4d2]/45 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-10rem)] max-w-4xl flex-col justify-center">
        <section className="space-y-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-body text-xs uppercase tracking-[0.35em] text-pine/60">
              WhereWasIt.ai
            </p>
            <h1 className="mt-4 font-display text-4xl leading-tight text-pine sm:text-5xl md:text-6xl">
              Lost something?
            </h1>
            <p className="mx-auto mt-4 max-w-xl font-body text-base leading-8 text-ink/72 sm:text-lg">
              {introCopy}
            </p>
          </div>

          {isLoading ? (
            <LoadingState />
          ) : hasResult && report ? (
            <div className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-5">
              <section className="rounded-[2rem] border border-white/70 bg-white/88 p-6 shadow-glow backdrop-blur sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-body text-xs uppercase tracking-[0.28em] text-pine/60">
                      Search Plan Ready
                    </p>
                    <h2 className="mt-3 font-display text-3xl text-pine sm:text-4xl">
                      Most Likely Area
                    </h2>
                    <p className="mt-3 font-display text-2xl leading-tight text-ember sm:text-3xl">
                      {report.mostLikelyArea}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {usedFallback ? (
                      <span className="rounded-full bg-gold/15 px-3 py-2 font-body text-xs uppercase tracking-[0.2em] text-gold">
                        Template fallback
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleReset}
                      className="rounded-full border border-pine/15 bg-white px-4 py-2 font-body text-sm font-semibold text-pine transition hover:bg-pine/5"
                    >
                      New Search
                    </button>
                  </div>
                </div>
              </section>

              <ResultCard title="Why This Makes Sense">
                <p className="leading-8">{report.whyThisMakesSense}</p>
              </ResultCard>

              <ResultCard title="Recommended Search Order">
                <ol className="space-y-3">
                  {report.prioritySearchOrder.map((step, index) => (
                    <li
                      key={`${index}-${step}`}
                      className="flex items-start gap-3 rounded-[1.35rem] border border-sand bg-[#fffaf3] px-4 py-4"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pine text-xs font-semibold text-white">
                        {index + 1}
                      </span>
                      <span className="leading-7">{step}</span>
                    </li>
                  ))}
                </ol>
              </ResultCard>

              <ResultCard title="Hidden Spots To Check">
                <div className="flex flex-wrap gap-2">
                  {report.hiddenSpots.map((spot) => (
                    <span
                      key={spot}
                      className="rounded-full border border-pine/15 bg-pine/5 px-3 py-2 text-sm"
                    >
                      {spot}
                    </span>
                  ))}
                </div>
              </ResultCard>

              <ResultCard title="Intuitive Signal">
                <p className="leading-8">{report.wisdomSignal}</p>
              </ResultCard>

              <ResultCard title="If It Is Not There">
                <p className="leading-8">{report.ifNotFound}</p>
              </ResultCard>

              <section className="rounded-[2rem] border border-pine/10 bg-pine/5 p-6 shadow-glow sm:p-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-body text-sm font-semibold uppercase tracking-[0.18em] text-pine">
                      Found It?
                    </p>
                    <p className="mt-2 font-body text-sm leading-7 text-ink/70">
                      Your feedback helps us improve the public alpha search coach.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleFeedback("found_it")}
                      className={`rounded-full px-4 py-2 font-body text-sm font-semibold transition ${
                        feedbackState === "found_it"
                          ? "bg-pine text-white"
                          : "border border-pine/15 bg-white text-pine hover:bg-pine/5"
                      }`}
                    >
                      Yes, found it
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFeedback("not_yet")}
                      className={`rounded-full px-4 py-2 font-body text-sm font-semibold transition ${
                        feedbackState === "not_yet"
                          ? "bg-ember text-white"
                          : "border border-ember/15 bg-white text-ember hover:bg-ember/5"
                      }`}
                    >
                      Not yet
                    </button>
                  </div>
                </div>

                {feedbackState ? (
                  <p className="mt-4 font-body text-sm leading-7 text-ink/70">
                    {feedbackState === "found_it"
                      ? "That is great to hear. Thanks for helping us learn what works."
                      : "Thanks for the signal. We will use it to improve the next search pass."}
                  </p>
                ) : null}
              </section>

              <details
                className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-glow backdrop-blur"
                open={showAdvancedAnalysis}
                onToggle={(event) => {
                  const nextOpen = (event.currentTarget as HTMLDetailsElement).open;
                  setShowAdvancedAnalysis(nextOpen);
                  trackEvent("advanced_analysis_toggled", { open: nextOpen });
                }}
              >
                <summary className="cursor-pointer list-none font-body text-sm font-semibold uppercase tracking-[0.2em] text-pine">
                  Advanced analysis
                </summary>

                {analysis ? (
                  <div className="mt-5 space-y-5 font-body text-sm leading-7 text-ink/78">
                    <div>
                      <p className="uppercase tracking-[0.24em] text-ink/50">Extracted</p>
                      <p className="mt-2">
                        <strong>Item:</strong> {analysis.input.itemType}
                        <br />
                        <strong>Category:</strong> {analysis.itemCategory}
                        <br />
                        <strong>Last seen:</strong> {analysis.input.lastSeenLocation}
                        <br />
                        <strong>Time:</strong> {analysis.input.lastSeenTime}
                        <br />
                        <strong>Gap:</strong> {analysis.memory.timeGapLabel}
                      </p>
                    </div>

                    <div>
                      <p className="uppercase tracking-[0.24em] text-ink/50">Transition moments</p>
                      <p className="mt-2">
                        {analysis.memory.transitionMoments.length > 0
                          ? analysis.memory.transitionMoments.join(", ")
                          : "No major transition moments detected"}
                      </p>
                    </div>

                    <div>
                      <p className="uppercase tracking-[0.24em] text-ink/50">Top local signals</p>
                      <ul className="mt-2 space-y-2">
                        {analysis.probabilities.slice(0, 3).map((entry) => (
                          <li key={entry.location} className="rounded-2xl bg-pine/5 px-4 py-3">
                            <strong>{entry.location}</strong> ({entry.score}/100): {entry.reasons[0]}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : null}
              </details>
            </div>
          ) : (
            <section className="mx-auto w-full max-w-3xl rounded-[2rem] border border-white/70 bg-white/84 p-5 shadow-glow backdrop-blur sm:p-7 md:p-8">
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="rounded-[1.5rem] border border-pine/10 bg-pine/5 p-4 sm:p-5">
                  <p className="font-body text-sm leading-7 text-ink/68">
                    The more details you provide, the better your chances of finding your item.
                  </p>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="font-body text-xs uppercase tracking-[0.2em] text-ink/55">
                        Item
                      </span>
                      <select
                        value={details.selectedItemType ?? ""}
                        onChange={(event) => {
                          updateDetail("selectedItemType", event.target.value);
                          if (event.target.value !== OTHER_OPTION) {
                            setCustomItemType("");
                          }
                        }}
                        className="mt-2 w-full rounded-2xl border border-sand bg-white px-4 py-3 font-body text-sm text-ink outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/15"
                      >
                        <option value="">Optional</option>
                        {itemTypeOptions.map((option) => (
                          <option
                            key={option}
                            value={option === "Other..." ? OTHER_OPTION : option}
                          >
                            {option}
                          </option>
                        ))}
                      </select>
                      {details.selectedItemType === OTHER_OPTION ? (
                        <input
                          type="text"
                          value={customItemType}
                          onChange={(event) => setCustomItemType(event.target.value)}
                          placeholder="Type your item"
                          className="mt-2 w-full rounded-2xl border border-sand bg-white px-4 py-3 font-body text-sm text-ink outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/15"
                        />
                      ) : null}
                    </label>

                    <label className="block">
                      <span className="font-body text-xs uppercase tracking-[0.2em] text-ink/55">
                        Last known place
                      </span>
                      <select
                        value={details.selectedPlace ?? ""}
                        onChange={(event) => {
                          updateDetail("selectedPlace", event.target.value);
                          if (event.target.value !== OTHER_OPTION) {
                            setCustomPlace("");
                          }
                        }}
                        className="mt-2 w-full rounded-2xl border border-sand bg-white px-4 py-3 font-body text-sm text-ink outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/15"
                      >
                        <option value="">Optional</option>
                        {placeOptions.map((option) => (
                          <option
                            key={option}
                            value={option === "Other..." ? OTHER_OPTION : option}
                          >
                            {option}
                          </option>
                        ))}
                      </select>
                      {details.selectedPlace === OTHER_OPTION ? (
                        <input
                          type="text"
                          value={customPlace}
                          onChange={(event) => setCustomPlace(event.target.value)}
                          placeholder="Type a place"
                          className="mt-2 w-full rounded-2xl border border-sand bg-white px-4 py-3 font-body text-sm text-ink outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/15"
                        />
                      ) : null}
                    </label>

                    <label className="block">
                      <span className="font-body text-xs uppercase tracking-[0.2em] text-ink/55">
                        Approximate time
                      </span>
                      <select
                        value={details.selectedTimeMode ?? "not_sure"}
                        onChange={(event) =>
                          updateDetail(
                            "selectedTimeMode",
                            event.target.value as OptionalDetailInputs["selectedTimeMode"]
                          )
                        }
                        className="mt-2 w-full rounded-2xl border border-sand bg-white px-4 py-3 font-body text-sm text-ink outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/15"
                      >
                        {timeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {details.selectedTimeMode === "approximate_hour" ? (
                        <select
                          value={details.selectedHour ?? ""}
                          onChange={(event) => updateDetail("selectedHour", event.target.value)}
                          className="mt-2 w-full rounded-2xl border border-sand bg-white px-4 py-3 font-body text-sm text-ink outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/15"
                        >
                          <option value="">Choose an hour</option>
                          {hourOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : null}
                    </label>

                    <label className="block">
                      <span className="font-body text-xs uppercase tracking-[0.2em] text-ink/55">
                        Date (optional)
                      </span>
                      <select
                        value={details.selectedDateMode ?? "not_sure"}
                        onChange={(event) =>
                          updateDetail(
                            "selectedDateMode",
                            event.target.value as OptionalDetailInputs["selectedDateMode"]
                          )
                        }
                        className="mt-2 w-full rounded-2xl border border-sand bg-white px-4 py-3 font-body text-sm text-ink outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/15"
                      >
                        {dateOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {details.selectedDateMode === "pick_date" ? (
                        <input
                          type="date"
                          value={details.selectedDate ?? ""}
                          onChange={(event) => updateDetail("selectedDate", event.target.value)}
                          className="mt-2 w-full rounded-2xl border border-sand bg-white px-4 py-3 font-body text-sm text-ink outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/15"
                        />
                      ) : null}
                    </label>
                  </div>
                </div>

                <textarea
                  className="min-h-56 w-full rounded-[1.9rem] border border-sand bg-[#fffaf3] px-5 py-5 font-body text-base leading-8 text-ink shadow-sm outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/20 disabled:cursor-not-allowed disabled:opacity-70 sm:min-h-64 sm:text-lg"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  disabled={isLoading}
                  placeholder="I lost my AirPods. I last used them in my bedroom this morning, then drove to work."
                />

                <div className="flex flex-col items-center gap-4 pt-1">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="rounded-full bg-pine px-7 py-3 font-body text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[#1f3a35] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Build My Search Plan
                  </button>

                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {examplePrompts.map((example) => (
                      <button
                        key={example.label}
                        type="button"
                        onClick={() => handleExampleClick(example.value, example.label)}
                        className="rounded-full border border-pine/10 bg-pine/5 px-4 py-2 font-body text-sm text-pine transition hover:bg-pine/10"
                      >
                        {example.label}
                      </button>
                    ))}
                  </div>
                </div>
              </form>

              {error ? (
                <div className="mt-5 rounded-[1.5rem] border border-ember/20 bg-ember/10 px-5 py-4">
                  <p className="font-body text-sm font-semibold uppercase tracking-[0.18em] text-ember">
                    We hit a snag
                  </p>
                  <p className="mt-2 font-body text-sm leading-7 text-ember">
                    {error} Try shortening the story to the last confirmed moment, then the next
                    place you went.
                  </p>
                </div>
              ) : null}

              <div className="mt-6 text-center font-body text-sm leading-7 text-ink/58">
                <p>No login, no payment, and no saved history in this public alpha version.</p>
                <p className="mt-2">
                  Review our{" "}
                  <Link
                    href="/privacy"
                    className="text-pine underline decoration-pine/30 underline-offset-4"
                    onClick={() => trackEvent("inline_link_clicked", { href: "/privacy" })}
                  >
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/terms"
                    className="text-pine underline decoration-pine/30 underline-offset-4"
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
