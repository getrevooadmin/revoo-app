# Defines the ECS Fargate cluster, CloudWatch log group, task definitions,
# and ECS services running the consumer and backoffice container workloads.

resource "aws_ecs_cluster" "main" {
  name = "revoo-cluster"
}

# Add CloudWatch Log Group so you can see container logs
resource "aws_cloudwatch_log_group" "revoo_logs" {
  name              = "/ecs/revoo"
  retention_in_days = 7
}

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

  load_balancer {
    target_group_arn = aws_lb_target_group.consumer.arn
    container_name   = "consumer"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.https]
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

  load_balancer {
    target_group_arn = aws_lb_target_group.backoffice.arn
    container_name   = "backoffice"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.https]
}
