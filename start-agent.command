#!/bin/bash
# ============================================================================
# This file is kept only for backward compatibility with old Desktop
# shortcuts. It no longer contains its own (outdated) startup logic —
# that used to create expo/.env.local (which the backend never reads) and
# run "npm run backend" from the wrong directory, causing the backend to
# silently fail to start.
#
# It now simply runs the real, up-to-date script: start-agent-v2.command.
# ============================================================================
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
exec "$SCRIPT_DIR/start-agent-v2.command"
