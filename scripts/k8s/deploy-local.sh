#!/usr/bin/env bash
set -euo pipefail

recreate_cluster=false
skip_cluster=false
skip_images=false
skip_observability=false

for arg in "$@"; do
  case "$arg" in
    --recreate-cluster)
      recreate_cluster=true
      ;;
    --skip-cluster)
      skip_cluster=true
      ;;
    --skip-images)
      skip_images=true
      ;;
    --skip-observability)
      skip_observability=true
      ;;
    -h|--help)
      cat <<'USAGE'
Usage: scripts/k8s/deploy-local.sh [options]

Options:
  --recreate-cluster     Delete and recreate the internship-local kind cluster.
  --skip-cluster         Do not create/switch the kind cluster.
  --skip-images          Do not build/load local Docker images.
  --skip-observability   Skip Helm observability installs.
  -h, --help             Show this help.
USAGE
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 2
      ;;
  esac
done

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "$1 is required for this deployment step." >&2
    exit 1
  fi
}

port_in_use() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
    return
  fi

  if command -v nc >/dev/null 2>&1; then
    nc -z 127.0.0.1 "$port" >/dev/null 2>&1
    return
  fi

  return 1
}

assert_ingress_ports_available() {
  local busy=()

  for port in 8080 8443; do
    if port_in_use "$port"; then
      busy+=("$port")
    fi
  done

  if ((${#busy[@]} > 0)); then
    echo "Cannot recreate kind with ingress mappings because local port(s) ${busy[*]} are already in use." >&2
    exit 1
  fi
}

apply_grafana_dashboard() {
  local dashboard_path="observability/grafana/provisioning/dashboards/json/internship-observability.json"

  if [[ ! -f "$dashboard_path" ]]; then
    echo "Dashboard JSON not found at $dashboard_path" >&2
    return 0
  fi

  kubectl create configmap internship-observability-dashboard \
    --namespace monitoring \
    --from-file="internship-observability.json=$dashboard_path" \
    --dry-run=client \
    -o yaml |
    kubectl label --local -f - grafana_dashboard=1 -o yaml |
    kubectl apply --validate=false -f -
}

require_command docker
require_command kubectl
require_command kind

if [[ "$skip_cluster" == false ]]; then
  clusters="$(kind get clusters || true)"

  if [[ "$recreate_cluster" == true ]] && grep -qx "internship-local" <<<"$clusters"; then
    kind delete cluster --name internship-local
    assert_ingress_ports_available
    clusters="$(kind get clusters || true)"
  fi

  if ! grep -qx "internship-local" <<<"$clusters"; then
    assert_ingress_ports_available
    kind create cluster --config k8s/cluster/kind-config.yaml
  else
    echo "Reusing existing internship-local. Use --recreate-cluster to apply new kind host port mappings."
  fi

  kubectl config use-context kind-internship-local
fi

kubectl apply --validate=false -f k8s/app/namespace.yaml
kubectl apply --validate=false -f k8s/app/serviceaccount.yaml

if [[ ! -f k8s/app/secret.local.yaml ]]; then
  cp k8s/app/secret.local.example.yaml k8s/app/secret.local.yaml
fi

kubectl apply --validate=false -f k8s/app/secret.local.yaml
kubectl apply --validate=false -f k8s/app/configmap.yaml
kubectl apply --validate=false -f k8s/app/dependencies.yaml

if [[ "$skip_observability" == false ]]; then
  require_command helm

  helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
  helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server
  helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
  helm repo add grafana https://grafana.github.io/helm-charts
  helm repo update

  helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
    --namespace ingress-nginx \
    --create-namespace \
    --values k8s/platform/ingress-nginx-values.yaml \
    --wait

  helm upgrade --install metrics-server metrics-server/metrics-server \
    --namespace kube-system \
    --values k8s/platform/metrics-server-values.yaml \
    --wait

  helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
    --namespace monitoring \
    --create-namespace \
    --values k8s/observability/kube-prometheus-stack-values.yaml \
    --wait

  helm upgrade --install loki grafana/loki \
    --namespace monitoring \
    --values k8s/observability/loki-values.yaml \
    --wait

  helm upgrade --install tempo grafana/tempo \
    --namespace monitoring \
    --values k8s/observability/tempo-values.yaml \
    --wait

  helm upgrade --install alloy grafana/alloy \
    --namespace monitoring \
    --values k8s/observability/alloy-values.yaml \
    --wait

  kubectl apply --validate=false -f k8s/observability/grafana-datasources.yaml
  kubectl apply --validate=false -f k8s/observability/otel-collector.yaml
  kubectl apply --validate=false -f k8s/observability/service-monitors.yaml
  kubectl apply --validate=false -f k8s/observability/prometheus-rules.yaml
  apply_grafana_dashboard
fi

kubectl wait --for=condition=available deployment/postgres -n internship --timeout=180s
kubectl wait --for=condition=available deployment/redis -n internship --timeout=180s
kubectl wait --for=condition=available deployment/dynamodb-local -n internship --timeout=180s

if [[ "$skip_images" == false ]]; then
  docker build -t internship-api:local ./backend
  docker build -t internship-chat:local ./chat-service
  kind load docker-image internship-api:local --name internship-local
  kind load docker-image internship-chat:local --name internship-local
fi

kubectl delete job backend-migrate chat-init -n internship --ignore-not-found
kubectl apply --validate=false -f k8s/app/backend-migration-job.yaml
kubectl apply --validate=false -f k8s/app/chat-init-job.yaml
kubectl wait --for=condition=complete job/backend-migrate -n internship --timeout=180s
kubectl wait --for=condition=complete job/chat-init -n internship --timeout=180s

kubectl apply --validate=false -f k8s/app/backend.yaml
kubectl apply --validate=false -f k8s/app/chat.yaml
kubectl apply --validate=false -f k8s/app/autoscaling.yaml
kubectl apply --validate=false -f k8s/app/ingress.local.yaml

if [[ "$skip_images" == false ]]; then
  kubectl rollout restart deployment/backend deployment/chat-service -n internship
fi

kubectl rollout status deployment/backend -n internship --timeout=180s
kubectl rollout status deployment/chat-service -n internship --timeout=180s
kubectl get pods,svc,ingress,hpa,pdb -n internship

cat <<'NEXT_STEPS'

Health checks:
  curl --noproxy '*' http://api.internship.localhost:8080/health/ready
  curl --noproxy '*' http://chat.internship.localhost:8080/health/ready

Grafana:
  kubectl port-forward service/kube-prometheus-stack-grafana 3001:80 -n monitoring
  open http://127.0.0.1:3001
NEXT_STEPS
