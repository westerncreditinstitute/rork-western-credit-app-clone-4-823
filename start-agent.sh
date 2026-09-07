#!/bin/bash
# ============================================================================
# This file is kept only for backward compatibility. It no longer contains
# its own (outdated) startup logic — it now simply runs the real, up-to-date
# script: start-agent-v2.command.
# ============================================================================
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
exec "$SCRIPT_DIR/start-agent-v2.command"
