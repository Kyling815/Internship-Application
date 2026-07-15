| Thành phần        | AWS service               | Vai trò                                                              |
| ----------------- | ------------------------- | -------------------------------------------------------------------- |
| DNS               | Route 53                  | Quản lý `app.example.com`, `api.example.com`, `realtime.example.com` |
| HTTPS             | AWS Certificate Manager   | Cấp TLS certificate miễn phí cho CloudFront và ALB                   |
| Frontend CDN      | CloudFront                | Phân phối React app, cache asset                                     |
| Frontend storage  | S3                        | Lưu thư mục `frontend/dist`                                          |
| Firewall          | AWS WAF                   | Chặn bot, request bất thường, rate-based rules                       |
| Load balancer     | Application Load Balancer | Route REST API và kết nối Socket.IO/WebSocket                        |
| Backend compute   | ECS Fargate               | Chạy container FastAPI                                               |
| Realtime compute  | ECS Fargate               | Chạy container Socket.IO                                             |
| Docker registry   | Amazon ECR                | Lưu Docker image từ GitHub Actions                                   |
| Database chính    | RDS PostgreSQL            | Users, jobs, applications, companies, documents                      |
| Chat database     | DynamoDB                  | Messages, conversation summary, notifications                        |
| Socket.IO scaling | ElastiCache Redis/Valkey  | Pub/Sub giữa nhiều Socket.IO task, presence, typing                  |
| File storage      | S3                        | CV, transcript, avatar, ảnh chat và attachment                       |
| Async queue       | SQS                       | Xử lý notification không đồng bộ                                     |
| Background worker | Lambda hoặc ECS worker    | Lưu notification, gửi email hoặc xử lý event                         |
| Secret storage    | Secrets Manager           | `DATABASE_URL`, `SECRET_KEY`, Redis credentials                      |
| Monitoring        | CloudWatch                | Container logs, metrics, alarms                                      |
| Permissions       | IAM                       | Task role và GitHub deployment role                                  |
| CI/CD             | GitHub Actions + AWS OIDC | Test, build, push và deploy                                          |
