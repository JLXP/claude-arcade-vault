#!/usr/bin/env bash
# PostToolUse hook: formatea con Prettier y aplica eslint --fix al archivo
# que Claude acaba de escribir. Conectado desde .claude/settings.json.
set -uo pipefail

root="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
file=$(jq -r '.tool_response.filePath // .tool_input.file_path // empty')

[ -n "$file" ] && [ -f "$file" ] || exit 0
case "$file" in
  "$root"/*) ;;                      # solo archivos de este proyecto
  *) exit 0 ;;
esac
case "$file" in
  */node_modules/*|*/.next/*) exit 0 ;;
esac

cd "$root" || exit 0

npx --no-install prettier --write --ignore-unknown "$file" >/dev/null 2>&1

case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs)
    # eslint sale 0 con warnings, asi que se reporta cualquier salida, no solo errores.
    out=$(npx --no-install eslint --fix "$file" 2>&1)
    if [ -n "$out" ]; then
      jq -n --arg ctx "$out" '{hookSpecificOutput:{hookEventName:"PostToolUse",additionalContext:("ESLint issues remain in the file just written:\n"+$ctx)}}'
    fi
    ;;
esac

exit 0
