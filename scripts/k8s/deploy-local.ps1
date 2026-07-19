[CmdletBinding()]
param(
  [switch]$RecreateCluster,
  [switch]$SkipCluster,
  [switch]$SkipImages,
  [switch]$SkipObservability
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $RepoRoot

function Invoke-Checked {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Label,

    [Parameter(Mandatory = $true)]
    [scriptblock]$Command
  )

  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed with exit code $LASTEXITCODE"
  }
}

function Get-KindCommand {
  $candidate = Get-Command kind -ErrorAction SilentlyContinue
  if ($candidate) {
    return $candidate.Source
  }

  $fallback = Join-Path $env:USERPROFILE "bin\kind.exe"
  if (Test-Path $fallback) {
    return $fallback
  }

  throw "kind was not found on PATH or at $fallback"
}

function Require-Command($Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name is required for this deployment step."
  }
}

function Assert-PortsAvailableForKindIngress {
  $listeners = Get-NetTCPConnection -LocalPort 8080,8443 -State Listen -ErrorAction SilentlyContinue
  if ($listeners) {
    $ports = ($listeners | Select-Object -ExpandProperty LocalPort -Unique) -join ", "
    throw "Cannot recreate kind with ingress mappings because local port(s) $ports are already in use."
  }
}

function Apply-GrafanaDashboard {
  $dashboardPath = "observability\grafana\provisioning\dashboards\json\internship-observability.json"
  if (-not (Test-Path $dashboardPath)) {
    Write-Warning "Dashboard JSON not found at $dashboardPath"
    return
  }

  kubectl create configmap internship-observability-dashboard `
    --namespace monitoring `
    --from-file="internship-observability.json=$dashboardPath" `
    --dry-run=client `
    -o yaml |
    kubectl label --local -f - grafana_dashboard=1 -o yaml |
    kubectl apply --validate=false -f -

  if ($LASTEXITCODE -ne 0) {
    throw "Grafana dashboard ConfigMap apply failed with exit code $LASTEXITCODE"
  }
}

$kind = Get-KindCommand
Require-Command kubectl
Require-Command docker

if (-not $SkipCluster) {
  $clusters = & $kind get clusters
  if ($LASTEXITCODE -ne 0) {
    throw "kind get clusters failed with exit code $LASTEXITCODE"
  }

  if ($RecreateCluster -and ($clusters -contains "internship-local")) {
    Invoke-Checked "kind delete cluster" { & $kind delete cluster --name internship-local }
    Assert-PortsAvailableForKindIngress
    $clusters = & $kind get clusters
    if ($LASTEXITCODE -ne 0) {
      throw "kind get clusters failed with exit code $LASTEXITCODE"
    }
  }

  if ($clusters -notcontains "internship-local") {
    Assert-PortsAvailableForKindIngress
    Invoke-Checked "kind create cluster" { & $kind create cluster --config k8s\cluster\kind-config.yaml }
  } else {
    Write-Warning "Reusing existing internship-local. Use -RecreateCluster to apply new kind host port mappings."
  }

  Invoke-Checked "kubectl use kind context" { kubectl config use-context kind-internship-local }
}

Invoke-Checked "apply namespaces" { kubectl apply --validate=false -f k8s\app\namespace.yaml }
Invoke-Checked "apply service account" { kubectl apply --validate=false -f k8s\app\serviceaccount.yaml }

if (-not (Test-Path "k8s\app\secret.local.yaml")) {
  Copy-Item "k8s\app\secret.local.example.yaml" "k8s\app\secret.local.yaml"
}

Invoke-Checked "apply local secret" { kubectl apply --validate=false -f k8s\app\secret.local.yaml }
Invoke-Checked "apply app config" { kubectl apply --validate=false -f k8s\app\configmap.yaml }
Invoke-Checked "apply local dependencies" { kubectl apply --validate=false -f k8s\app\dependencies.yaml }

if (-not $SkipObservability) {
  Require-Command helm

  Invoke-Checked "helm repo add ingress-nginx" { helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx }
  Invoke-Checked "helm repo add metrics-server" { helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server }
  Invoke-Checked "helm repo add prometheus-community" { helm repo add prometheus-community https://prometheus-community.github.io/helm-charts }
  Invoke-Checked "helm repo add grafana" { helm repo add grafana https://grafana.github.io/helm-charts }
  Invoke-Checked "helm repo update" { helm repo update }

  Invoke-Checked "install ingress-nginx" {
    helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx `
      --namespace ingress-nginx `
      --create-namespace `
      --values k8s\platform\ingress-nginx-values.yaml `
      --wait
  }

  Invoke-Checked "install metrics-server" {
    helm upgrade --install metrics-server metrics-server/metrics-server `
      --namespace kube-system `
      --values k8s\platform\metrics-server-values.yaml `
      --wait
  }

  Invoke-Checked "install kube-prometheus-stack" {
    helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack `
      --namespace monitoring `
      --create-namespace `
      --values k8s\observability\kube-prometheus-stack-values.yaml `
      --wait
  }

  Invoke-Checked "install loki" {
    helm upgrade --install loki grafana/loki `
      --namespace monitoring `
      --values k8s\observability\loki-values.yaml `
      --wait
  }

  Invoke-Checked "install tempo" {
    helm upgrade --install tempo grafana/tempo `
      --namespace monitoring `
      --values k8s\observability\tempo-values.yaml `
      --wait
  }

  Invoke-Checked "install alloy" {
    helm upgrade --install alloy grafana/alloy `
      --namespace monitoring `
      --values k8s\observability\alloy-values.yaml `
      --wait
  }

  Invoke-Checked "apply Grafana datasources" { kubectl apply --validate=false -f k8s\observability\grafana-datasources.yaml }
  Invoke-Checked "apply OTel collector" { kubectl apply --validate=false -f k8s\observability\otel-collector.yaml }
  Invoke-Checked "apply ServiceMonitors" { kubectl apply --validate=false -f k8s\observability\service-monitors.yaml }
  Invoke-Checked "apply Prometheus rules" { kubectl apply --validate=false -f k8s\observability\prometheus-rules.yaml }
  Apply-GrafanaDashboard
}

Invoke-Checked "wait for postgres" { kubectl wait --for=condition=available deployment/postgres -n internship --timeout=180s }
Invoke-Checked "wait for redis" { kubectl wait --for=condition=available deployment/redis -n internship --timeout=180s }
Invoke-Checked "wait for dynamodb-local" { kubectl wait --for=condition=available deployment/dynamodb-local -n internship --timeout=180s }

if (-not $SkipImages) {
  Invoke-Checked "build backend image" { docker build -t internship-api:local .\backend }
  Invoke-Checked "build chat image" { docker build -t internship-chat:local .\chat-service }
  Invoke-Checked "load backend image into kind" { & $kind load docker-image internship-api:local --name internship-local }
  Invoke-Checked "load chat image into kind" { & $kind load docker-image internship-chat:local --name internship-local }
}

Invoke-Checked "delete old jobs" { kubectl delete job backend-migrate chat-init -n internship --ignore-not-found }
Invoke-Checked "apply backend migration job" { kubectl apply --validate=false -f k8s\app\backend-migration-job.yaml }
Invoke-Checked "apply chat init job" { kubectl apply --validate=false -f k8s\app\chat-init-job.yaml }
Invoke-Checked "wait for backend migration job" { kubectl wait --for=condition=complete job/backend-migrate -n internship --timeout=180s }
Invoke-Checked "wait for chat init job" { kubectl wait --for=condition=complete job/chat-init -n internship --timeout=180s }

Invoke-Checked "apply backend deployment" { kubectl apply --validate=false -f k8s\app\backend.yaml }
Invoke-Checked "apply chat deployment" { kubectl apply --validate=false -f k8s\app\chat.yaml }
Invoke-Checked "apply autoscaling" { kubectl apply --validate=false -f k8s\app\autoscaling.yaml }
Invoke-Checked "apply local ingress" { kubectl apply --validate=false -f k8s\app\ingress.local.yaml }

if (-not $SkipImages) {
  Invoke-Checked "restart app deployments for freshly loaded local images" { kubectl rollout restart deployment/backend deployment/chat-service -n internship }
}

Invoke-Checked "rollout backend" { kubectl rollout status deployment/backend -n internship --timeout=180s }
Invoke-Checked "rollout chat-service" { kubectl rollout status deployment/chat-service -n internship --timeout=180s }
Invoke-Checked "show internship resources" { kubectl get pods,svc,ingress,hpa,pdb -n internship }

Write-Host ""
Write-Host "Health checks:"
Write-Host "  kubectl port-forward service/backend 8001:8000 -n internship"
Write-Host "  Invoke-RestMethod http://127.0.0.1:8001/health/ready"
Write-Host "  kubectl port-forward service/chat-service 3002:3000 -n internship"
Write-Host "  Invoke-RestMethod http://127.0.0.1:3002/health/ready"
Write-Host "  Invoke-RestMethod -Headers @{ Host = 'api.internship.localhost' } http://127.0.0.1:8080/health/ready"
Write-Host "  Invoke-RestMethod -Headers @{ Host = 'chat.internship.localhost' } http://127.0.0.1:8080/health/ready"
