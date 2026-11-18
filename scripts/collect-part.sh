#!/usr/bin/env bash
# One part of a collector run, for the "Keep the archive filling" workflow.
# Usage: bash scripts/collect-part.sh <part> <answer-file>
set -u
part="$1"; out="$2"
auth=()
if [ -n "${CRON_SECRET:-}" ]; then auth=(-H "Authorization: Bearer $CRON_SECRET"); fi
code=$(curl -sS --max-time 320 -o "$out" -w "%{http_code}" "${auth[@]}" "https://debrief.to/api/collect?part=${part}&of=2")
head -c 3000 "$out"; echo
echo "collector part ${part} of 2 answered HTTP $code"
if [ "$code" = "401" ]; then echo "::error::CRON_SECRET in GitHub doesn't match the one in Vercel"; exit 1; fi
if [ "$code" != "200" ]; then echo "::error::collector part ${part} did not finish (HTTP $code)"; exit 1; fi
