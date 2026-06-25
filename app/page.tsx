"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { trackEvent } from "@/lib/analytics";
import { LocalAnalysis, OptionalDetailInputs, ReportSections } from "@/lib/types";

type AnalyzeResponse = {
  analysis: LocalAnalysis;
  report: ReportSections;
  usedFallback: boolean;
  error?: string;
};

type FeedbackState = "found_it" | "not_yet" | null;

const itemTypeOptions = [
  "Keys",
  "Wallet",
  "Phone",
  "AirPods / Earbuds",
  "Ring / Jewelry",
  "Passport / Documents",
  "Glasses",
  "Bag / Backpack",
  "Other"
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
  "Not sure"
];

const dateOptions = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "pick_date", label: "Pick a date" },
  { value: "not_sure", label: "Not sure" }
];

const timeOptions = [
  { value: "early_morning", label: "Early morning (5–8)" },
  { value: "morning", label: "Morning (8–12)" },
  { value: "afternoon", label: "Afternoon (12–5)" },
  { value: "evening", label: "Evening (5–9)" },
  { value: "night", label: "Night (9–12)" },
  { value: "late_night", label: "Late night (12–5)" },
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

const examplePrompts = [
  "I lost my AirPods. I last used them in my bedroom this morning, then drove to work.",
  "I misplaced my wedding ring. I took it off in the bathroom before showering, then changed clothes in the bedroom.",
  "I can't find my wallet. I used it at the grocery store, drove home, carried bags inside, and dropped things on the kitchen counter."
];

function LoadingReport() {
  return (
    <div className="mt-6 space-y-4 animate-pulse">
      <div className="rounded-3xl bg-pine/6 p-5">
        <div className="h-3 w-32 rounded-full bg-pine/15" />
        <div className="mt-4 h-8 w-3/4 rounded-full bg-ember/20" />
      </div>
      <div className="space-y-3 rounded-3xl border border-sand bg-[#fffaf3] p-5">
        <div className="h-3 w-40 rounded-full bg-pine/12" />
        <div className="h-12 rounded-2xl bg-pine/8" />
        <div className="h-12 rounded-2xl bg-pine/8" />
        <div className="h-12 rounded-2xl bg-pine/8" />
      </div>
      <div className="rounded-3xl border border-pine/10 bg-pine/5 p-5">
        <p className="font-body text-sm leading-7 text-pine/80">
          Tracing the timeline, checking habit patterns, and building your first search pass.
        </p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [input, setInput] = useState(examplePrompts[0]);
  const [report, setReport] = useState<ReportSections | null>(null);
  const [analysis, setAnalysis] = useState<LocalAnalysis | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<FeedbackState>(null);
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);
  const [details, setDetails] = useState<OptionalDetailInputs>({
    selectedDateMode: "not_sure",
    selectedTimeMode: "not_sure"
  });

  useEffect(() => {
    if (report && analysis) {
      trackEvent("analysis_report_viewed", {
        itemCategory: analysis.itemCategory,
        usedFallback
      });
    }
  }, [report, analysis, usedFallback]);

  function handleExampleClick(example: string) {
    setInput(example);
    trackEvent("example_prompt_selected", { example });
  }

  function updateDetail<K extends keyof OptionalDetailInputs>(
    key: K,
    value: OptionalDetailInputs[K]
  ) {
    setDetails((current) => ({ ...current, [key]: value }));
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
    trackEvent("analysis_started", {
      inputLength: input.trim().length,
      usedOptionalDetails: showOptionalDetails
    });

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          input,
          ...details
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

  return (
    <main className="relative overflow-hidden px-4 py-6 sm:px-6 md:px-10 md:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 md:gap-10">
        <header className="rounded-[2rem] border border-white/70 bg-white/65 px-5 py-5 shadow-glow backdrop-blur md:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-body text-xs uppercase tracking-[0.35em] text-pine/65">
                WhereWasIt.ai Public Alpha
              </p>
              <h1 className="mt-2 font-display text-4xl leading-tight text-pine sm:text-5xl md:text-6xl">
                Lost something?
                <span className="block text-ember">Let&apos;s retrace the clues.</span>
              </h1>
              <p className="mt-4 max-w-2xl font-body text-base leading-7 text-ink/75 sm:text-lg">
                A calm search coach for English-speaking users. We combine memory cues, habit
                patterns, and practical search signals to help you start in the right place.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[28rem]">
              {[
                "No login required",
                "Built for quick first searches",
                "Public alpha this week"
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[1.5rem] border border-pine/10 bg-pine/5 px-4 py-4 font-body text-sm leading-6 text-pine"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-glow backdrop-blur sm:p-7 md:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-body text-sm uppercase tracking-[0.24em] text-ink/55">
                  Start Here
                </p>
                <p className="mt-2 font-body text-sm leading-7 text-ink/70">
                  Tell us what you lost, where you last remember using it, and what happened next.
                </p>
              </div>
              <div className="rounded-full bg-gold/12 px-4 py-2 font-body text-xs uppercase tracking-[0.18em] text-gold">
                Alpha feedback welcome
              </div>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label className="block font-body text-sm font-medium uppercase tracking-[0.2em] text-ink/60">
                Tell me what you lost and what happened.
              </label>
              <textarea
                className="min-h-44 w-full rounded-[1.5rem] border border-sand bg-[#fffaf3] px-5 py-4 font-body text-base leading-7 text-ink shadow-sm outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/20 disabled:cursor-not-allowed disabled:opacity-70"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                disabled={isLoading}
                placeholder="I lost my keys. I had them in the kitchen after lunch, then I rushed out to the car."
              />

              <div className="rounded-[1.25rem] border border-pine/10 bg-pine/5">
                <button
                  type="button"
                  onClick={() => {
                    const nextState = !showOptionalDetails;
                    setShowOptionalDetails(nextState);
                    trackEvent("optional_details_toggled", { expanded: nextState });
                  }}
                  className="flex w-full items-center justify-between px-4 py-3 text-left font-body text-sm font-semibold text-pine transition hover:bg-pine/5"
                >
                  <span>+ Add more details (optional)</span>
                  <span className="text-xs uppercase tracking-[0.16em] text-pine/60">
                    {showOptionalDetails ? "Hide" : "Show"}
                  </span>
                </button>

                {showOptionalDetails ? (
                  <div className="grid gap-4 border-t border-pine/10 px-4 py-4 md:grid-cols-2">
                    <label className="block">
                      <span className="font-body text-xs uppercase tracking-[0.2em] text-ink/55">
                        Item type
                      </span>
                      <select
                        value={details.selectedItemType ?? ""}
                        onChange={(event) => updateDetail("selectedItemType", event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-sand bg-white px-4 py-3 font-body text-sm text-ink outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/15"
                      >
                        <option value="">Use only my story</option>
                        {itemTypeOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="font-body text-xs uppercase tracking-[0.2em] text-ink/55">
                        Last known place
                      </span>
                      <select
                        value={details.selectedPlace ?? ""}
                        onChange={(event) => updateDetail("selectedPlace", event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-sand bg-white px-4 py-3 font-body text-sm text-ink outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/15"
                      >
                        <option value="">Use only my story</option>
                        {placeOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="font-body text-xs uppercase tracking-[0.2em] text-ink/55">
                        Last seen date
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
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="rounded-full bg-pine px-6 py-3 font-body text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[#1f3a35] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoading ? "Tracing the clues..." : "Build my search plan"}
                </button>
                <p className="font-body text-sm leading-6 text-ink/60">
                  No payment, no account, no saved history in this alpha version.
                </p>
              </div>
            </form>

            <div className="mt-6">
              <p className="font-body text-xs uppercase tracking-[0.24em] text-ink/45">
                Try an example
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {examplePrompts.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => handleExampleClick(example)}
                    className="rounded-full border border-pine/10 bg-pine/5 px-4 py-2 text-left font-body text-sm text-pine transition hover:bg-pine/10"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

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
          </div>

          <div className="rounded-[2rem] border border-pine/10 bg-pine p-5 text-white shadow-glow sm:p-7 md:p-8">
            <p className="font-body text-sm uppercase tracking-[0.32em] text-white/60">
              What you get
            </p>
            <div className="mt-5 space-y-4 font-body text-[15px] leading-7 text-white/85">
              <p>A clear starting area instead of a vague hunch.</p>
              <p>A practical search order shaped by your timeline and habit patterns.</p>
              <p>One intuitive signal to help you check the overlooked spot before widening out.</p>
            </div>
            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/10 p-5">
              <p className="font-body text-xs uppercase tracking-[0.28em] text-white/55">
                Public alpha promise
              </p>
              <p className="mt-3 font-body text-sm leading-7 text-white/80">
                We do not claim prediction. We help you retrace your steps, organize the clues,
                and start with the most likely search zones.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {["Most Likely Area", "Recommended Search Order", "Hidden Spots", "Intuitive Signal"].map(
                  (item) => (
                    <span
                      key={item}
                      className="rounded-full border border-white/10 bg-white/10 px-3 py-2 font-body text-xs uppercase tracking-[0.16em] text-sand"
                    >
                      {item}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-glow backdrop-blur sm:p-7 md:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-3xl text-pine">Recovery Report</h2>
                <p className="mt-2 font-body text-sm leading-7 text-ink/65">
                  Your first search pass appears here after analysis.
                </p>
              </div>
              {usedFallback ? (
                <span className="rounded-full bg-gold/15 px-3 py-1 font-body text-xs uppercase tracking-[0.2em] text-gold">
                  Template fallback
                </span>
              ) : null}
            </div>

            {isLoading ? (
              <LoadingReport />
            ) : report ? (
              <div className="mt-6 space-y-6 font-body text-ink/85">
                <div>
                  <h3 className="font-body text-sm uppercase tracking-[0.24em] text-ink/55">
                    Most Likely Area
                  </h3>
                  <p className="mt-2 font-display text-3xl leading-tight text-ember">
                    {report.mostLikelyArea}
                  </p>
                </div>

                <div>
                  <h3 className="font-body text-sm uppercase tracking-[0.24em] text-ink/55">
                    Why This Makes Sense
                  </h3>
                  <p className="mt-2 leading-7">{report.whyThisMakesSense}</p>
                </div>

                <div>
                  <h3 className="font-body text-sm uppercase tracking-[0.24em] text-ink/55">
                    Recommended Search Order
                  </h3>
                  <ul className="mt-3 space-y-3">
                    {report.prioritySearchOrder.map((step) => (
                      <li
                        key={step}
                        className="rounded-2xl border border-sand bg-[#fffaf3] px-4 py-3 leading-7"
                      >
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-body text-sm uppercase tracking-[0.24em] text-ink/55">
                    Hidden Spots To Check
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {report.hiddenSpots.map((spot) => (
                      <span
                        key={spot}
                        className="rounded-full border border-pine/15 bg-pine/5 px-3 py-2 text-sm"
                      >
                        {spot}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-body text-sm uppercase tracking-[0.24em] text-ink/55">
                    Intuitive Signal
                  </h3>
                  <p className="mt-2 leading-7">{report.wisdomSignal}</p>
                </div>

                <div>
                  <h3 className="font-body text-sm uppercase tracking-[0.24em] text-ink/55">
                    If It Is Not There
                  </h3>
                  <p className="mt-2 leading-7">{report.ifNotFound}</p>
                </div>

                <div className="rounded-[1.5rem] border border-pine/10 bg-pine/5 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-body text-sm font-semibold uppercase tracking-[0.18em] text-pine">
                        Found It?
                      </p>
                      <p className="mt-2 font-body text-sm leading-7 text-ink/70">
                        This quick alpha feedback helps us improve the search coach.
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
                        : "Thanks for the signal. We will use this to improve the next search pass."}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-[1.5rem] border border-dashed border-sand bg-[#fffaf3] p-6 font-body leading-7 text-ink/65">
                Your report will appear here after you describe what happened. Start with the last
                place you clearly remember using the item, then mention where you went after.
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-glow backdrop-blur sm:p-7 md:p-8">
            <h2 className="font-display text-3xl text-pine">Clue Snapshot</h2>
            <p className="mt-2 font-body text-sm leading-7 text-ink/65">
              A lightweight view of the local clues behind the report.
            </p>

            {analysis ? (
              <div className="mt-6 space-y-5 font-body text-sm leading-7 text-ink/80">
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
                    <br />
                    <strong>Visited:</strong>{" "}
                    {analysis.input.placesVisited.length > 0
                      ? analysis.input.placesVisited.join(", ")
                      : "No later stops detected"}
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
            ) : (
              <div className="mt-6 rounded-[1.5rem] bg-pine/5 p-6 font-body leading-7 text-ink/65">
                This panel will show the extracted clues and the strongest local signals behind the
                report.
              </div>
            )}

            <div className="mt-6 rounded-[1.5rem] border border-pine/10 bg-white/70 p-5">
              <p className="font-body text-xs uppercase tracking-[0.24em] text-ink/45">
                Privacy note
              </p>
              <p className="mt-2 font-body text-sm leading-7 text-ink/70">
                This public alpha is designed for quick, practical search help. Review our{" "}
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
          </div>
        </section>
      </div>
    </main>
  );
}
