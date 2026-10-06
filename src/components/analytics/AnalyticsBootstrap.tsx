"use client";

import { useEffect } from "react";

import { readCampaignRefFromSearch } from "@/lib/analytics/campaign";
import { touchVisitorState } from "@/lib/analytics/visitor";

/**
 * Capture first `?ref=` attribution and touch visit-day state.
 * Mount once in the root layout.
 */
export function AnalyticsBootstrap() {
  useEffect(() => {
    try {
      const incoming = readCampaignRefFromSearch(window.location.search);
      touchVisitorState({ incomingRef: incoming });
    } catch {
      // Ignore — analytics must not break the page.
    }
  }, []);

  return null;
}
