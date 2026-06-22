#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [[ ! -f .env ]]; then
  echo "Missing .env. Copy .env.example to .env and configure it first." >&2
  exit 1
fi

docker compose up -d --build

backend_mapping="$(docker compose port backend 8000)"
backend_port="${backend_mapping##*:}"
backend_url="http://127.0.0.1:${backend_port}"

echo "Waiting for backend at ${backend_url}/health..."
backend_ready=false
for _ in $(seq 1 30); do
  if curl -fsS "${backend_url}/health" >/dev/null; then
    backend_ready=true
    break
  fi
  sleep 2
done

if [[ "$backend_ready" != true ]]; then
  echo "Backend did not become healthy." >&2
  docker compose logs --tail=100 backend
  exit 1
fi

docker compose exec -T backend python -m app.seed

echo "Waiting for frontend at http://127.0.0.1:5173..."
frontend_ready=false
for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:5173 >/dev/null; then
    frontend_ready=true
    break
  fi
  sleep 2
done

if [[ "$frontend_ready" != true ]]; then
  echo "Frontend did not become ready." >&2
  docker compose logs --tail=100 frontend
  exit 1
fi

docker compose ps
echo "Backend health: ${backend_url}/health"
echo "Frontend: http://127.0.0.1:5173"
echo "Demo login: demo@student.edu / password123"
