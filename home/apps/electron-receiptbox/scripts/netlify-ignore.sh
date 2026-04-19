#!/usr/bin/env bash
set -euo pipefail

# Netlify build.ignore contract:
# - exit 0: skip build
# - exit 1: run build
#
# Strict default: only production builds run.

context="${CONTEXT:-}"
branch="${BRANCH:-}"
allow_previews="${ALLOW_DEPLOY_PREVIEWS:-false}"
allow_branches_raw="${ALLOWED_BRANCH_DEPLOYS:-}"

if [[ "$context" == "production" ]]; then
  echo "netlify-ignore: allowing production deploy."
  exit 1
fi

if [[ "$context" == "deploy-preview" ]]; then
  if [[ "$allow_previews" == "true" ]]; then
    echo "netlify-ignore: allowing deploy-preview because ALLOW_DEPLOY_PREVIEWS=true."
    exit 1
  fi

  echo "netlify-ignore: skipping deploy-preview (ALLOW_DEPLOY_PREVIEWS is not true)."
  exit 0
fi

if [[ "$context" == "branch-deploy" ]]; then
  if [[ -z "$allow_branches_raw" ]]; then
    echo "netlify-ignore: skipping branch-deploy for  (no ALLOWED_BRANCH_DEPLOYS set)."
    exit 0
  fi

  IFS=, read -r -a allowed_branches <<< "$allow_branches_raw"
  for allowed in "${allowed_branches[@]}"; do
    allowed_trimmed="$(echo "$allowed" | xargs)"
    if [[ -n "$allowed_trimmed" && "$branch" == "$allowed_trimmed" ]]; then
      echo "netlify-ignore: allowing branch-deploy for ."
      exit 1
    fi
  done

  echo "netlify-ignore: skipping branch-deploy for  (not in ALLOWED_BRANCH_DEPLOYS)."
  exit 0
fi

echo "netlify-ignore: skipping context  by default."
exit 0
