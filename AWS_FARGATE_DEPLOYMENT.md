# AWS Fargate Deployment Guide

This document provides a step-by-step guide to building, pushing, and deploying the `backoffice` and `consumer` applications to **AWS Fargate (Amazon ECS)**.

---

## 1. Prerequisites

1. **AWS CLI** installed and configured (`aws configure`).
2. **Docker Engine** installed and running.
3. AWS IAM permissions for **Amazon ECR** (Elastic Container Registry) and **Amazon ECS** (Elastic Container Service).

---

## 2. Amazon ECR (Elastic Container Registry) Setup

### Step 2.1: Create ECR Repositories

Run the following commands in AWS CLI to create container repositories for each app:

```bash
# Set your AWS Region and Account ID
export AWS_REGION="us-east-1"
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create ECR repository for Backoffice
aws ecr create-repository \
  --repository-name revoo-backoffice \
  --region $AWS_REGION

# Create ECR repository for Consumer
aws ecr create-repository \
  --repository-name revoo-consumer \
  --region $AWS_REGION
```

### Step 2.2: Authenticate Docker with Amazon ECR

```bash
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
```

---

## 3. Build & Push Docker Images

### Step 3.1: Build Backoffice Image

```bash
docker build \
  -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/revoo-backoffice:latest \
  -f apps/backoffice/Dockerfile \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="https://your-supabase-project.supabase.co" \
  --build-arg SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
  .
```

### Step 3.2: Build Consumer Image

```bash
docker build \
  -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/revoo-consumer:latest \
  -f apps/consumer/Dockerfile \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="https://your-supabase-project.supabase.co" \
  --build-arg SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
  .
```

### Step 3.3: Push Images to ECR

```bash
# Push Backoffice image
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/revoo-backoffice:latest

# Push Consumer image
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/revoo-consumer:latest
```

---

## 4. AWS Fargate Deployment Setup

### Step 4.1: ECS Task Definition Overview

Each service (`backoffice` & `consumer`) runs as an **AWS Fargate Task**.

**Key Task Definition Parameters**:
- **Launch type**: `FARGATE`
- **Network Mode**: `awsvpc`
- **Operating System Family**: `LINUX`
- **Architecture**: `X86_64` (or `ARM64` if building on Apple Silicon without `--platform linux/amd64`)
- **Container Port**: `3000`
- **Environment Variables**:
  - `PORT`: `3000`
  - `HOSTNAME`: `0.0.0.0`
  - `NODE_ENV`: `production`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (Reference via AWS Systems Manager Parameter Store or Secrets Manager)

### Step 4.2: Example Task Definition JSON (`task-definition-backoffice.json`)

```json
{
  "family": "revoo-backoffice-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::<ACCOUNT_ID>:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::<ACCOUNT_ID>:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "backoffice-container",
      "image": "<ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/revoo-backoffice:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3000,
          "hostPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        { "name": "PORT", "value": "3000" },
        { "name": "HOSTNAME", "value": "0.0.0.0" },
        { "name": "NODE_ENV", "value": "production" }
      ],
      "secrets": [
        {
          "name": "NEXT_PUBLIC_SUPABASE_URL",
          "valueFrom": "arn:aws:ssm:<REGION>:<ACCOUNT_ID>:parameter/revoo/NEXT_PUBLIC_SUPABASE_URL"
        },
        {
          "name": "SUPABASE_SERVICE_ROLE_KEY",
          "valueFrom": "arn:aws:ssm:<REGION>:<ACCOUNT_ID>:parameter/revoo/SUPABASE_SERVICE_ROLE_KEY"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/revoo-backoffice",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Step 4.3: Register Task Definition & Update ECS Service

```bash
# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition-backoffice.json --region $AWS_REGION

# Force new deployment on existing Fargate service
aws ecs update-service \
  --cluster revoo-cluster \
  --service revoo-backoffice-service \
  --force-new-deployment \
  --region $AWS_REGION
```

---

## 5. Local Container Testing

You can test both containers locally using Docker Compose before deploying:

```bash
# Build and start both containers
docker-compose up --build

# Verify Backoffice on http://localhost:3001
# Verify Consumer on http://localhost:3002
```

---

## 6. Architecture Notes & Best Practices

1. **Multi-Arch Builds**: If building on Mac M1/M2/M3 for Fargate standard `X86_64` instances, use Docker Buildx:
   ```bash
   docker buildx build --platform linux/amd64 -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/revoo-backoffice:latest -f apps/backoffice/Dockerfile --push .
   ```
2. **Standalone Mode Optimization**: `output: "standalone"` in `next.config.ts` shrinks Docker image size significantly by only including modules strictly required by each application.
3. **Layer Caching**: `turbo prune` splits project dependency definitions (`json`) from source code (`full`) to optimize `npm ci` layer caching when code changes without changing `package.json`.
