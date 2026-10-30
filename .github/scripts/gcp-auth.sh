#!/usr/bin/env bash
# Signs gcloud, and every Google client of the job, in as SERVICE_ACCOUNT through Workload Identity
# Federation: GitHub signs a short-lived OIDC token for this job and Google trades it for credentials
# of that account. No key is stored anywhere. The organisation only allows Actions published by
# GitHub, so this does by hand what google-github-actions/auth would do.
set -euo pipefail
: "${SERVICE_ACCOUNT:?}" "${WORKLOAD_IDENTITY_PROVIDER:?}"

token_file="$RUNNER_TEMP/github-oidc-token"
credentials_file="$RUNNER_TEMP/gcp-credentials.json"

curl --silent --show-error --fail \
  --header "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
  "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=https://iam.googleapis.com/$WORKLOAD_IDENTITY_PROVIDER" \
  | jq --raw-output .value >"$token_file"

gcloud iam workload-identity-pools create-cred-config "$WORKLOAD_IDENTITY_PROVIDER" \
  --service-account "$SERVICE_ACCOUNT" \
  --credential-source-file "$token_file" \
  --output-file "$credentials_file"
gcloud auth login --cred-file "$credentials_file" --quiet

echo "GOOGLE_APPLICATION_CREDENTIALS=$credentials_file" >>"$GITHUB_ENV"
