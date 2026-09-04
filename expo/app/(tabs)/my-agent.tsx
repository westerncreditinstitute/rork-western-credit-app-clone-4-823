/**
 * My Agent — bottom tab entry point.
 *
 * Reuses the same screen component as the standalone `/my-agent` route so
 * there is a single source of truth for the AI Credit Repair Agent UI.
 * `embedded` hides the back button and lets the tab navigator own the
 * safe-area inset.
 */
import React from "react";

import MyAgentScreen from "../my-agent";

export default function MyAgentTab() {
  return <MyAgentScreen embedded />;
}
