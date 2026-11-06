import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  countContentLeaves,
  findEdgeInsetViolations,
  type EdgeInsetFinding,
  type LayoutNode,
} from './edgeInset';

export const AUDIT_METRICS = {
  frame: { x: 0, y: 0, width: 412, height: 915 },
  insets: { top: 24, left: 0, right: 0, bottom: 24 },
};

/**
 * Render `ui`, wait for `readyText` if given, run `interact` if given (tap the
 * row that opens a picker, then wait for it), and audit what's on screen.
 * Throws when nothing rendered at all, so a sheet left closed or a screen
 * missing its data can't pass by having no content to check.
 */
export async function auditScreen(
  ui: React.ReactElement,
  opts: { readyText?: string | RegExp; interact?: () => Promise<void> } = {}
): Promise<EdgeInsetFinding[]> {
  const r = await render(<SafeAreaProvider initialMetrics={AUDIT_METRICS}>{ui}</SafeAreaProvider>);
  if (opts.readyText) await screen.findByText(opts.readyText);
  if (opts.interact) await opts.interact();
  const tree = r.toJSON() as LayoutNode | LayoutNode[] | null;
  if (countContentLeaves(tree) === 0) {
    throw new Error(
      'auditScreen: rendered no text or icons, so there is nothing to audit. Check the props ' +
        '(a sheet needs `visible`), the data it needs, or pass readyText to wait for it to load.'
    );
  }
  return findEdgeInsetViolations(tree);
}
