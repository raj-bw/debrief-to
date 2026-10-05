#!/usr/bin/env bash
# Lighthouse on both builds, taking turns so drift on the runner hits both alike.
lh() { npx -y lighthouse@13.5.0 "$1" "${@:2}" --quiet --output=json --chrome-flags=--headless=new --blocked-url-patterns="*/_vercel/insights/*" || true; }
for run in 1 2 3 4 5; do
  lh "http://localhost:3001/?town=newmarket" --output-path=lh-phone-main-run$run.json
  lh "http://localhost:3002/?town=newmarket" --output-path=lh-phone-branch-run$run.json
done
# The same, with the phone connection actually slowed down rather than
# estimated afterwards, so the browser's own loading decisions show
for run in 1 2 3 4 5; do
  lh "http://localhost:3001/?town=newmarket" --throttling-method=devtools --output-path=lh-phoneslowed-main-run$run.json
  lh "http://localhost:3002/?town=newmarket" --throttling-method=devtools --output-path=lh-phoneslowed-branch-run$run.json
done
for run in 1 2 3; do
  lh "http://localhost:3001/?town=newmarket" --preset=desktop --output-path=lh-desktop-main-run$run.json
  lh "http://localhost:3002/?town=newmarket" --preset=desktop --output-path=lh-desktop-branch-run$run.json
done
