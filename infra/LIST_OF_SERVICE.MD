| Component         | AWS service                  | Role                                                                 |
| ----------------- | ---------------------------- | -------------------------------------------------------------------- |
| DNS               | Route 53                     | Manage `app.example.com`, `api.example.com`, and `realtime.example.com` |
| HTTPS             | AWS Certificate Manager      | Issue TLS certificates for CloudFront and ALB                         |
| Frontend CDN      | CloudFront                   | Serve the React/Vite static app                                       |
| Frontend storage  | S3                           | Store `frontend/dist` artifacts                                       |
| Firewall          | AWS WAF                      | Optional bot, anomaly, and rate-based protection                      |
| Load balancer     | Application Load Balancer    | Route REST API and Socket.IO/WebSocket traffic to EKS ingress         |
| Backend compute   | Amazon EKS                   | Run the FastAPI deployment, HPA, PDB, and rollout jobs                |
| Realtime compute  | Amazon EKS                   | Run the Socket.IO deployment with sticky ALB targets and Redis adapter |
| Docker registry   | Amazon ECR                   | Store backend and chat images from GitHub Actions                     |
| Main database     | Amazon RDS PostgreSQL        | Users, jobs, applications, companies, and documents metadata          |
| Chat database     | Amazon DynamoDB              | Chat users, groups, and messages                                      |
| Socket.IO scaling | ElastiCache/Valkey for Redis | Pub/Sub between chat-service pods                                     |
| File storage      | S3                           | CVs, transcripts, avatars, chat images, and attachments               |
| Secret storage    | GitHub Environments + K8s Secret or AWS Secrets Manager | Runtime secrets for deployments                         |
| Metrics           | kube-prometheus-stack        | Prometheus, Alertmanager, Grafana, kube-state-metrics                 |
| Logs              | Loki + Grafana Alloy         | Pod log collection and querying                                       |
| Traces            | OpenTelemetry Collector + Tempo | OTLP trace ingestion and Grafana trace exploration                 |
| Permissions       | IAM + IRSA + GitHub OIDC     | Least-privilege deploy and pod runtime access                         |
| CI/CD             | GitHub Actions               | Test, build, push images, deploy to EKS, publish frontend             |
