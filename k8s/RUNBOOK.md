# Chang 9 Kubernetes/EKS Runbook

This runbook is for teammates who want to run the project from a clean laptop on Windows, macOS, or Linux.

Local Kubernetes runs on `kind` and uses in-cluster PostgreSQL, Redis, and DynamoDB Local. Production/EKS uses AWS managed services and GitHub Actions.

## 0. What You Will Get

After a successful local run:

- API: `http://api.internship.localhost:8080/health/ready`
- Chat: `http://chat.internship.localhost:8080/health/ready`
- Backend port-forward fallback: `http://127.0.0.1:8001/health/ready`
- Chat port-forward fallback: `http://127.0.0.1:3002/health/ready`
- Grafana: `http://127.0.0.1:3001`
- Kubernetes namespaces:
  - `internship` for app and local databases
  - `monitoring` for Prometheus, Grafana, Loki, Alloy, Tempo, and OTel Collector

The first full run can take 10-25 minutes because Docker images and Helm charts are downloaded.

## 1. Prerequisites

Use a terminal opened at the repository root.

```text
C:\disk D\Internship-Application          # Windows example
~/code/Internship-Application             # macOS/Linux example
```

Required tools:

- Git
- Docker Desktop or Docker Engine
- kubectl
- kind
- Helm

Recommended Docker Desktop resources:

- CPU: 4 cores minimum, 6+ better
- Memory: 8 GB minimum, 12+ GB better
- Disk: 20 GB free

Docker Desktop Kubernetes does not need to be enabled. `kind` creates its own cluster inside Docker.

## 2. Install Tools

### Windows

Install with `winget` from PowerShell:

```powershell
winget install Git.Git
winget install Docker.DockerDesktop
winget install Kubernetes.kubectl
winget install Kubernetes.kind
winget install Helm.Helm
```

Restart PowerShell after installing. Then check:

```powershell
git --version
docker version
kubectl version --client
kind version
helm version
```

If `kind` is installed but not on `PATH`, this repo's PowerShell script also checks:

```powershell
$env:USERPROFILE\bin\kind.exe
```

### macOS

Install with Homebrew:

```bash
brew install git kubectl kind helm
brew install --cask docker
```

Open Docker Desktop once and wait until it says Docker is running. Then check:

```bash
git --version
docker version
kubectl version --client
kind version
helm version
```

### Linux

Use your package manager for Docker, Git, and curl. For Kubernetes tools:

```bash
brew install kubectl kind helm
```

Linux without Homebrew is fine too; just install the official `kubectl`, `kind`, and `helm` binaries and make sure they are on `PATH`.

## 3. Before You Run

Make sure ports `8080` and `8443` are free. Local ingress uses them.

Windows:

```powershell
Get-NetTCPConnection -LocalPort 8080,8443 -State Listen -ErrorAction SilentlyContinue |
  Select-Object LocalAddress,LocalPort,OwningProcess
```

macOS/Linux:

```bash
lsof -nP -iTCP:8080 -sTCP:LISTEN
lsof -nP -iTCP:8443 -sTCP:LISTEN
```

If the old Docker Compose stack is running, stop it first so it does not compete for ports or CPU:

Windows:

```powershell
docker compose -f docker-compose.yml -f docker-compose.observability.yml stop
```

macOS/Linux:

```bash
docker compose -f docker-compose.yml -f docker-compose.observability.yml stop
```

The local secret file is created automatically from `k8s/app/secret.local.example.yaml` if it does not exist:

```text
k8s/app/secret.local.yaml
```

Keep it local. Do not commit real secrets.

## 4. Quick Start

### Windows PowerShell

From the repository root:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\scripts\k8s\deploy-local.ps1 -RecreateCluster
```

For a faster app-only rerun after the cluster already exists:

```powershell
.\scripts\k8s\deploy-local.ps1 -SkipCluster -SkipObservability
```

For a lightweight laptop run without Grafana/Loki/Tempo:

```powershell
.\scripts\k8s\deploy-local.ps1 -RecreateCluster -SkipObservability
```

### macOS/Linux

From the repository root:

```bash
chmod +x scripts/k8s/deploy-local.sh
./scripts/k8s/deploy-local.sh --recreate-cluster
```

For a faster app-only rerun after the cluster already exists:

```bash
./scripts/k8s/deploy-local.sh --skip-cluster --skip-observability
```

For a lightweight laptop run without Grafana/Loki/Tempo:

```bash
./scripts/k8s/deploy-local.sh --recreate-cluster --skip-observability
```

## 5. Verify The App

Check Kubernetes resources:

Windows:

```powershell
kubectl get pods,svc,ingress,hpa,pdb -n internship
kubectl wait --for=condition=complete job/backend-migrate job/chat-init -n internship --timeout=30s
```

macOS/Linux:

```bash
kubectl get pods,svc,ingress,hpa,pdb -n internship
kubectl wait --for=condition=complete job/backend-migrate job/chat-init -n internship --timeout=30s
```

Expected:

- `backend` pods are `Running`
- `chat-service` pods are `Running`
- `backend-migrate` is `Completed`
- `chat-init` is `Completed`
- HPA shows CPU values after one metrics-server scrape cycle

Health through local ingress:

Windows:

```powershell
Invoke-RestMethod http://api.internship.localhost:8080/health/ready
Invoke-RestMethod http://chat.internship.localhost:8080/health/ready
```

macOS/Linux:

```bash
curl --noproxy '*' http://api.internship.localhost:8080/health/ready
curl --noproxy '*' http://chat.internship.localhost:8080/health/ready
```

Expected API response:

```json
{"status":"ready","service":"internship-api","dependencies":{"postgres":true}}
```

Expected chat response:

```json
{"status":"ready","dependencies":{"redis":true,"dynamodb":true}}
```

## 6. Port-Forward Fallback

Use this when ingress is being debugged or ports `8080/8443` are not available.

Windows, use two terminal windows:

```powershell
kubectl port-forward service/backend 8001:8000 -n internship
```

```powershell
Invoke-RestMethod http://127.0.0.1:8001/health/ready
```

Then for chat:

```powershell
kubectl port-forward service/chat-service 3002:3000 -n internship
```

```powershell
Invoke-RestMethod http://127.0.0.1:3002/health/ready
```

macOS/Linux:

```bash
kubectl port-forward service/backend 8001:8000 -n internship
curl --noproxy '*' http://127.0.0.1:8001/health/ready
```

```bash
kubectl port-forward service/chat-service 3002:3000 -n internship
curl --noproxy '*' http://127.0.0.1:3002/health/ready
```

`kubectl port-forward` is a long-running command. Keep it open while you send the request from another terminal.

## 7. Observability

Check monitoring pods:

```bash
kubectl get pods,svc,servicemonitor,prometheusrule -n monitoring
```

Open Grafana:

Windows:

```powershell
kubectl port-forward service/kube-prometheus-stack-grafana 3001:80 -n monitoring
```

macOS/Linux:

```bash
kubectl port-forward service/kube-prometheus-stack-grafana 3001:80 -n monitoring
```

Then open:

```text
http://127.0.0.1:3001
```

Local login:

```text
admin / admin123
```

Prometheus target check:

Windows:

```powershell
$job = Start-Job -ScriptBlock { kubectl port-forward service/kube-prometheus-stack-prometheus 9092:9090 -n monitoring }
Start-Sleep -Seconds 8
$targets = Invoke-RestMethod "http://127.0.0.1:9092/api/v1/targets?state=active"
$targets.data.activeTargets |
  Where-Object { $_.labels.namespace -eq "internship" -or $_.discoveredLabels.__meta_kubernetes_namespace -eq "internship" } |
  Select-Object @{Name="job";Expression={$_.labels.job}}, @{Name="instance";Expression={$_.labels.instance}}, health, lastError
Stop-Job $job
Remove-Job $job
```

macOS/Linux:

```bash
kubectl port-forward service/kube-prometheus-stack-prometheus 9092:9090 -n monitoring
```

In another terminal:

```bash
curl --noproxy '*' "http://127.0.0.1:9092/api/v1/targets?state=active"
```

Expected internship targets:

- `backend` is `up`
- `chat-service` is `up`

Tempo trace smoke test:

```bash
curl --noproxy '*' http://api.internship.localhost:8080/openapi.json >/dev/null
curl --noproxy '*' http://chat.internship.localhost:8080/api/status >/dev/null
kubectl port-forward service/tempo 3201:3200 -n monitoring
curl --noproxy '*' http://127.0.0.1:3201/metrics | grep tempo_distributor_spans_received_total
```

Loki smoke test:

```bash
kubectl port-forward service/loki-gateway 3101:80 -n monitoring
curl --noproxy '*' -G "http://127.0.0.1:3101/loki/api/v1/query_range" --data-urlencode 'query={namespace="internship"}' --data-urlencode 'limit=5'
```

## 8. Daily Development Loop

After code changes in backend or chat:

Windows:

```powershell
.\scripts\k8s\deploy-local.ps1 -SkipCluster -SkipObservability
```

macOS/Linux:

```bash
./scripts/k8s/deploy-local.sh --skip-cluster --skip-observability
```

If behavior does not change after a rebuild, make sure the image was loaded into kind and the deployment restarted:

```bash
kind load docker-image internship-api:local --name internship-local
kind load docker-image internship-chat:local --name internship-local
kubectl rollout restart deployment/backend deployment/chat-service -n internship
```

## 9. Reset Or Clean Up

Full local reset:

Windows:

```powershell
kind delete cluster --name internship-local
.\scripts\k8s\deploy-local.ps1 -RecreateCluster
```

macOS/Linux:

```bash
kind delete cluster --name internship-local
./scripts/k8s/deploy-local.sh --recreate-cluster
```

Stop local Docker Compose stack if it was started separately:

```bash
docker compose -f docker-compose.yml -f docker-compose.observability.yml stop
```

Delete unused Docker data only when you understand the impact:

```bash
docker system df
```

## 10. Troubleshooting

### `kind` cannot bind port 8080 or 8443

Another process is already listening.

Windows:

```powershell
Get-NetTCPConnection -LocalPort 8080,8443 -State Listen -ErrorAction SilentlyContinue |
  Select-Object LocalAddress,LocalPort,OwningProcess
Get-Process -Id <PID>
```

macOS/Linux:

```bash
lsof -nP -iTCP:8080 -sTCP:LISTEN
lsof -nP -iTCP:8443 -sTCP:LISTEN
```

Stop the process or use port-forward fallback.

### Ingress does not answer, but pods are healthy

Check these:

```bash
docker ps --filter name=internship-local-control-plane
kubectl get svc -n ingress-nginx ingress-nginx-controller -o wide
kubectl describe ingress backend chat-service -n internship
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller --tail=120
```

Expected Docker port mapping:

```text
127.0.0.1:8080->30080/tcp
127.0.0.1:8443->30443/tcp
```

### HPA shows `<unknown>`

Metrics-server may need one or two scrape cycles.

```bash
kubectl get apiservice v1beta1.metrics.k8s.io
kubectl top pods -n internship
kubectl describe hpa backend chat-service -n internship
```

If metrics-server is not available, inspect:

```bash
kubectl logs deployment/metrics-server -n kube-system --tail=120
```

### Health check returns 404 on localhost

You may be hitting another local process instead of the kind service. Prefer explicit `127.0.0.1` for port-forward checks and inspect port ownership.

Windows:

```powershell
Get-NetTCPConnection -LocalPort 8001,3000,3002 -State Listen -ErrorAction SilentlyContinue |
  Select-Object LocalAddress,LocalPort,OwningProcess
```

macOS/Linux:

```bash
lsof -nP -iTCP:8001 -sTCP:LISTEN
lsof -nP -iTCP:3000 -sTCP:LISTEN
lsof -nP -iTCP:3002 -sTCP:LISTEN
```

### Pods still run old code

Rebuilding a Docker image is not enough for kind. Load the image and restart the deployment:

```bash
docker build -t internship-api:local ./backend
docker build -t internship-chat:local ./chat-service
kind load docker-image internship-api:local --name internship-local
kind load docker-image internship-chat:local --name internship-local
kubectl rollout restart deployment/backend deployment/chat-service -n internship
```

### Laptop is slow or pods restart

Run the app without observability first:

Windows:

```powershell
.\scripts\k8s\deploy-local.ps1 -RecreateCluster -SkipObservability
```

macOS/Linux:

```bash
./scripts/k8s/deploy-local.sh --recreate-cluster --skip-observability
```

Then install observability later:

Windows:

```powershell
.\scripts\k8s\deploy-local.ps1 -SkipCluster -SkipImages
```

macOS/Linux:

```bash
./scripts/k8s/deploy-local.sh --skip-cluster --skip-images
```

## 11. EKS Deployment

Most teammates do not need this for local development. Use this section only when deploying to AWS.

Required AWS resources:

- EKS cluster
- AWS Load Balancer Controller
- ECR repositories for backend and chat
- RDS PostgreSQL
- DynamoDB tables
- ElastiCache/Valkey Redis
- S3 bucket and CloudFront distribution for frontend
- GitHub OIDC role for deploy workflow

GitHub Environment secrets:

- `AWS_ROLE_TO_ASSUME`
- `SECRET_KEY`
- `DATABASE_URL`
- `REDIS_URL`
- `S3_BUCKET` when uploads use S3

GitHub Environment variables:

- `AWS_REGION`
- `EKS_CLUSTER_NAME`
- `ECR_REPOSITORY_BACKEND`
- `ECR_REPOSITORY_CHAT`
- `FRONTEND_ORIGIN`
- `API_HOST`
- `CHAT_HOST`
- `IRSA_ROLE_ARN`
- `VITE_API_BASE_URL`
- `VITE_CHAT_API_BASE_URL`
- `FRONTEND_BUCKET`
- `CLOUDFRONT_DISTRIBUTION_ID`

Deploy backend/chat manually from GitHub Actions:

```text
Actions -> Deploy EKS -> Run workflow
```

Deploy frontend:

```text
Actions -> Deploy Frontend -> Run workflow
```

The backend/chat workflow builds and pushes SHA-tagged images to ECR, updates kubeconfig, applies manifests, runs migration/init jobs, rolls out deployments, and optionally smoke-tests public health URLs.

The frontend workflow builds Vite with production API/chat URLs, uploads `frontend/dist` to S3, and invalidates CloudFront.

## 12. Maintainer Checks

Before opening a PR:

Windows:

```powershell
python -m py_compile backend\app\main.py backend\app\core\tracing.py
Push-Location chat-service; npm run check; Pop-Location
Push-Location frontend; npm run build; Pop-Location
docker run --rm -v "${PWD}:/repo" -w /repo bash:5.2 bash -n scripts/k8s/deploy-eks.sh scripts/k8s/deploy-local.sh
git diff --check
```

macOS/Linux:

```bash
python -m py_compile backend/app/main.py backend/app/core/tracing.py
(cd chat-service && npm run check)
(cd frontend && npm run build)
bash -n scripts/k8s/deploy-eks.sh scripts/k8s/deploy-local.sh
git diff --check
```
