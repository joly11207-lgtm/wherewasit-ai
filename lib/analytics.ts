"use client";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
    plausible?: (eventName: string, options?: { props?: Record<string, unknown> }) => void;
  }
}

export type AnalyticsPayload = {
  event: string;
  props?: Record<string, unknown>;
};

function postToApi(payload: AnalyticsPayload): void {
  const body = JSON.stringify({
    ...payload,
    path: window.location.pathname,
    url: window.location.href,
    timestamp: new Date().toISOString()
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    return;
  }

  void fetch("/api/track", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body,
    keepalive: true
  }).catch(() => {
    return undefined;
  });
}

export function trackEvent(event: string, props?: Record<string, unknown>): void {
  if (typeof window === "undefined") {
    return;
  }

  const payload = { event, props };

  postToApi(payload);
  window.dataLayer?.push(payload);
  window.gtag?.("event", event, props);
  window.plausible?.(event, props ? { props } : undefined);
}
