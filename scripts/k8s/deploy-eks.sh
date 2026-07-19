#!/usr/bin/env bash
set -euo pipefail

: "${BACKEND_IMAGE:?BACKEND_IMAGE is required}"
: "${CHAT_IMAGE:?CHAT_IMAGE is required}"
: "${SECRET_KEY:?SECRET_KEY is required}"
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${REDIS_URL:?REDIS_URL is required}"
: "${AWS_REGION:?AWS_REGION is required}"

NAMESPACE="${K8S_NAMESPACE:-internship}"
FRONTEND_ORIGIN="${FRONTEND_ORIGIN:-https://app.example.com}"
API_HOST="${API_HOST:-api.example.com}"
CHAT_HOST="${CHAT_HOST:-realtime.example.com}"
DYNAMODB_USERS_TABLE="${DYNAMODB_USERS_TABLE:-ChatUsers}"
DYNAMODB_GROUPS_TABLE="${DYNAMODB_GROUPS_TABLE:-ChatGroups}"
DYNAMODB_MESSAGES_TABLE="${DYNAMODB_MESSAGES_TABLE:-ChatMessages}"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "${tmp_dir}"' EXIT

kubectl apply -f k8s/app/namespace.yaml
kubectl apply -f k8s/app/serviceaccount.yaml

if [[ -n "${IRSA_ROLE_ARN:-}" ]]; then
  sed "s|arn:aws:iam::123456789012:role/internship-app-irsa|${IRSA_ROLE_ARN}|g" \
    k8s/eks/serviceaccount.yaml |
    kubectl apply -f -
fi

secret_args=(
  "--from-literal=SECRET_KEY=${SECRET_KEY}"
  "--from-literal=DATABASE_URL=${DATABASE_URL}"
  "--from-literal=REDIS_URL=${REDIS_URL}"
)

if [[ -n "${S3_BUCKET:-}" ]]; then
  secret_args+=("--from-literal=S3_BUCKET=${S3_BUCKET}")
fi

if [[ -n "${S3_PUBLIC_BASE_URL:-}" ]]; then
  secret_args+=("--from-literal=S3_PUBLIC_BASE_URL=${S3_PUBLIC_BASE_URL}")
fi

kubectl create secret generic internship-secrets \
  --namespace "${NAMESPACE}" \
  "${secret_args[@]}" \
  --dry-run=client \
  -o yaml |
  kubectl apply -f -

sed \
  -e "s|https://app.example.com|${FRONTEND_ORIGIN}|g" \
  -e "s|ap-southeast-1|${AWS_REGION}|g" \
  -e "s|ChatUsers|${DYNAMODB_USERS_TABLE}|g" \
  -e "s|ChatGroups|${DYNAMODB_GROUPS_TABLE}|g" \
  -e "s|ChatMessages|${DYNAMODB_MESSAGES_TABLE}|g" \
  k8s/eks/configmap.yaml > "${tmp_dir}/configmap.yaml"

sed "s|image: internship-api:local|image: ${BACKEND_IMAGE}|g" \
  k8s/app/backend-migration-job.yaml > "${tmp_dir}/backend-migration-job.yaml"

sed "s|image: internship-chat:local|image: ${CHAT_IMAGE}|g" \
  k8s/app/chat-init-job.yaml > "${tmp_dir}/chat-init-job.yaml"

sed "s|image: internship-api:local|image: ${BACKEND_IMAGE}|g" \
  k8s/app/backend.yaml > "${tmp_dir}/backend.yaml"

sed "s|image: internship-chat:local|image: ${CHAT_IMAGE}|g" \
  k8s/app/chat.yaml > "${tmp_dir}/chat.yaml"

sed \
  -e "s|api.example.com|${API_HOST}|g" \
  -e "s|realtime.example.com|${CHAT_HOST}|g" \
  k8s/eks/ingress-alb.yaml > "${tmp_dir}/ingress-alb.yaml"

kubectl apply -f "${tmp_dir}/configmap.yaml"

kubectl delete job backend-migrate chat-init -n "${NAMESPACE}" --ignore-not-found
kubectl apply -f "${tmp_dir}/backend-migration-job.yaml"
kubectl apply -f "${tmp_dir}/chat-init-job.yaml"
kubectl wait --for=condition=complete job/backend-migrate -n "${NAMESPACE}" --timeout=300s
kubectl wait --for=condition=complete job/chat-init -n "${NAMESPACE}" --timeout=300s

kubectl apply -f "${tmp_dir}/backend.yaml"
kubectl apply -f "${tmp_dir}/chat.yaml"
kubectl apply -f k8s/app/autoscaling.yaml
kubectl apply -f "${tmp_dir}/ingress-alb.yaml"

if kubectl api-resources | grep -q '^servicemonitors'; then
  kubectl apply -f k8s/observability/service-monitors.yaml
  kubectl apply -f k8s/observability/prometheus-rules.yaml
fi

kubectl rollout status deployment/backend -n "${NAMESPACE}" --timeout=300s
kubectl rollout status deployment/chat-service -n "${NAMESPACE}" --timeout=300s

if [[ -n "${API_HEALTH_URL:-}" ]]; then
  curl -fsS "${API_HEALTH_URL%/}/health/ready"
fi

if [[ -n "${CHAT_HEALTH_URL:-}" ]]; then
  curl -fsS "${CHAT_HEALTH_URL%/}/health/ready"
fi

