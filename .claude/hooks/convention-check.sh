#!/bin/bash
# Stop hook: Check if code files in relevant directories were modified.
# Only triggers the convention checker agent when actual source code changed.
# Prevents infinite loops via stop_hook_active flag.

INPUT=$(cat)

# Prevent infinite re-entry
STOP_HOOK_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false')
if [ "$STOP_HOOK_ACTIVE" = "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" || exit 0

# Get modified files (staged + unstaged + untracked)
MODIFIED_FILES=$(git diff --name-only HEAD 2>/dev/null; git diff --name-only --cached 2>/dev/null; git ls-files --others --exclude-standard 2>/dev/null)

if [ -z "$MODIFIED_FILES" ]; then
  exit 0
fi

# Filter to only code files in relevant directories
HAS_PAGE=false
HAS_SCHEMA=false
HAS_API=false
HAS_STYLE=false
HAS_DS=false
RELEVANT_FILES=""

while IFS= read -r file; do
  case "$file" in
    src/app/td/acap/*.tsx|src/app/tm/acap/*.tsx)
      HAS_PAGE=true
      RELEVANT_FILES+="$file"$'\n'
      ;;
    src/app/td/acap/*.ts|src/app/tm/acap/*.ts)
      HAS_STYLE=true
      RELEVANT_FILES+="$file"$'\n'
      ;;
    src/aca/domain/*.schema.ts|src/domain/*.schema.ts)
      HAS_SCHEMA=true
      RELEVANT_FILES+="$file"$'\n'
      ;;
    src/aca/domain/*.api.ts|src/domain/*.api.ts)
      HAS_API=true
      RELEVANT_FILES+="$file"$'\n'
      ;;
    src/ds/components/*.tsx|src/ds/components/*.ts)
      HAS_DS=true
      RELEVANT_FILES+="$file"$'\n'
      ;;
    src/ds-tm/components/*.tsx|src/ds-tm/components/*.ts)
      HAS_DS=true
      RELEVANT_FILES+="$file"$'\n'
      ;;
  esac
done <<< "$MODIFIED_FILES"

# If no convention-relevant files were modified, exit silently
if [ -z "$RELEVANT_FILES" ]; then
  exit 0
fi

# Build categories list
CATEGORIES=""
if [ "$HAS_PAGE" = true ]; then
  CATEGORIES+="page/component files, "
fi
if [ "$HAS_SCHEMA" = true ]; then
  CATEGORIES+="schema files, "
fi
if [ "$HAS_API" = true ]; then
  CATEGORIES+="API files, "
fi
if [ "$HAS_STYLE" = true ]; then
  CATEGORIES+="style files, "
fi
if [ "$HAS_DS" = true ]; then
  CATEGORIES+="design system files, "
fi
# Trim trailing comma+space
CATEGORIES=${CATEGORIES%, }

# Build the block message
MSG="Code files were modified in: ${CATEGORIES}.
Run the project-convention-checker agent on these files and report findings. DO NOT FIX — only report violations.

Modified files:
${RELEVANT_FILES}"

jq -n --arg msg "$MSG" '{
  "decision": "block",
  "reason": $msg
}'
exit 0
