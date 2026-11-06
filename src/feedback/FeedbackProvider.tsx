/**
 * Feedback context — exposes `useFeedback().open()` to the whole app. The footer
 * and Settings row open the independent repository's issue form in the browser.
 *
 * Also the one place that installs on-device diagnostics capture (console + crash
 * breadcrumbs into the bounded, scrubbed buffer) — once, at app root.
 *
 * Diagnostic capture remains on-device; issue forms are opened without logs.
 */

import React, { createContext, useContext, useEffect } from 'react';
import { installDiagnostics } from './log';
import { collectDiagnostics } from './diagnostics';
import type { FeedbackType } from './compose';
import { openFeedbackMail } from '../lib/links';

type FeedbackApi = {
  /** Open the issue form. The optional type preserves existing callers. */
  open: (type?: FeedbackType) => void;
};

// Feedback opens the fork's issue form. No diagnostics are uploaded automatically.
const feedbackApi: FeedbackApi = { open: () => openFeedbackMail() };
const FeedbackContext = createContext<FeedbackApi>(feedbackApi);

export function useFeedback(): FeedbackApi {
  return useContext(FeedbackContext);
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  // Start capturing diagnostics as early as the tree mounts (covers everything
  // after app launch; a crash is flushed to disk for the next session). The
  // version/device facts ride the session-start line as well as the report
  // header, because the recovered PREVIOUS session may well be a different
  // build — which is exactly the case worth spotting in a crash report.
  useEffect(() => {
    const d = collectDiagnostics();
    installDiagnostics({ version: d.version, device: d.device, locale: d.locale });
  }, []);

  return (
    <FeedbackContext.Provider value={feedbackApi}>
      {children}
    </FeedbackContext.Provider>
  );
}
