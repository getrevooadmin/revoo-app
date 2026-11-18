terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket       = "revoo-terraform-state-243478201778"
    key          = "prod/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
  }
}

provider "aws" {
  region = "us-east-1"
}

# ---------------------------------------------------------
# 1. VARIABLES (Values come from terraform.tfvars)
# ---------------------------------------------------------
variable "supabase_url" {
  type = string
}
variable "supabase_publishable_key" {
  type = string
}
variable "supabase_secret_key" {
  type      = string
  sensitive = true
}

# ---------------------------------------------------------
# 2. DATA (Look up existing AWS resources we already have)
# ---------------------------------------------------------
data "aws_vpc" "default" {
  default = true
}
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}
data "aws_ecr_repository" "revoo_apps" {
  name = "revoo-apps"
}
data "aws_iam_role" "ecs_task_execution_role" {
  name = "ecsTaskExecutionRole"
}

# ---------------------------------------------------------
# 3. SECURITY GROUP (Open TCP Port 3000)
# ---------------------------------------------------------
resource "aws_security_group" "revoo_sg" {
  name        = "revoo-terraform-sg"
  description = "Allow HTTP traffic on port 3000"
  vpc_id      = data.aws_vpc.default.id
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ---------------------------------------------------------
# 4. ECS CLUSTER
# ---------------------------------------------------------
resource "aws_ecs_cluster" "main" {
  name = "revoo-cluster"
}

# ---------------------------------------------------------
# 5. TASK DEFINITION (Consumer App)
# ---------------------------------------------------------
resource "aws_ecs_task_definition" "consumer" {
  family                   = "revoo-consumer-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256" # 0.25 vCPU
  memory                   = "512" # 0.5 GB
  execution_role_arn       = data.aws_iam_role.ecs_task_execution_role.arn
  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }
  container_definitions = jsonencode([
    {
      name      = "consumer"
      image     = "${data.aws_ecr_repository.revoo_apps.repository_url}:consumer-latest"
      essential = true
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "NEXT_PUBLIC_SUPABASE_URL", value = var.supabase_url },
        { name = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", value = var.supabase_publishable_key },
        { name = "SUPABASE_SECRET_KEY", value = var.supabase_secret_key }
      ]
    }
  ])
}

# Add CloudWatch Log Group so you can see container logs
resource "aws_cloudwatch_log_group" "revoo_logs" {
  name              = "/ecs/revoo"
  retention_in_days = 7
}

# TASK DEFINITION (Backoffice App)
resource "aws_ecs_task_definition" "backoffice" {
  family                   = "revoo-backoffice-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = data.aws_iam_role.ecs_task_execution_role.arn
  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }
  container_definitions = jsonencode([
    {
      name      = "backoffice"
      image     = "${data.aws_ecr_repository.revoo_apps.repository_url}:backoffice-latest"
      essential = true
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "NEXT_PUBLIC_SUPABASE_URL", value = var.supabase_url },
        { name = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", value = var.supabase_publishable_key },
        { name = "SUPABASE_SECRET_KEY", value = var.supabase_secret_key }
      ]
      logConfiguration = {
        logDriver = "awslogs",
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.revoo_logs.name
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "backoffice"
        }
      }
    }
  ])
}


# ---------------------------------------------------------
# 6. ECS SERVICE (Keeps 1 Consumer Task Running)
# ---------------------------------------------------------
resource "aws_ecs_service" "consumer" {
  name            = "revoo-consumer-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.consumer.arn
  desired_count   = 1
  launch_type     = "FARGATE"
  network_configuration {
    subnets          = data.aws_subnets.default.ids
    security_groups  = [aws_security_group.revoo_sg.id]
    assign_public_ip = true
  }
}

# ECS SERVICE (Backoffice)
resource "aws_ecs_service" "backoffice" {
  name            = "revoo-backoffice-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backoffice.arn
  desired_count   = 1
  launch_type     = "FARGATE"
  network_configuration {
    subnets          = data.aws_subnets.default.ids
    security_groups  = [aws_security_group.revoo_sg.id]
    assign_public_ip = true
  }
}
