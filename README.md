# Cloud Images Application – AWS ECS Fargate & Automated CI/CD

פרויקט זה מציג ארכיטקטורת ענן מודרנית לפריסת אפליקציית ניהול והצגת תמונות. המערכת מבוססת על Docker, רצה כשרות מבוזר ומאובטח ב-AWS ECS Fargate מאחורי Load Balancer, ומנוהלת בתהליך פיתוח רציף (CI/CD) מלא באמצעות GitHub Actions.

---

## 🏗️ ארכיטקטורת המערכת (Architecture Overview)

הארכיטקטורה שנבחרה נועדה להבטיח זמינות גבוהה (High Availability), אבטחה מקסימלית ואפס זמן השבתה (Zero Downtime Deployments).

```mermaid
graph TD
    Client[Client / Browser] -->|HTTP Request| ALB[Application Load Balancer]
    
    subgraph AWS ECS Cluster (eu-central-1)
        ALB --> Service[ECS Fargate Service]
        Service --> Task1[ECS Task 1 - Container]
        Service --> Task2[ECS Task 2 - Container]
    end

    Task1 -->|IAM Task Role Access| S3[(S3 Bucket: ran-cloud-images)]
    Task2 -->|IAM Task Role Access| S3

    subgraph CI/CD Pipeline (GitHub Actions)
        Developer[Git Push to main] --> GitHub[GitHub Actions Workflow]
        GitHub -->|1. Build & Push Image| ECR[Amazon ECR]
        GitHub -->|2. Force New Deployment| Service
    end