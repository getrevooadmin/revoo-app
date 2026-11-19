# Fetches existing AWS resources including the default VPC and subnets,
# the ECR repository, the ECS task execution IAM role, and the wildcard ACM certificate.

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

# Look up the ISSUED *.getrevoo.com SSL certificate created in bootstrap
data "aws_acm_certificate" "wildcard" {
  domain   = "*.getrevoo.com"
  statuses = ["ISSUED"]
}
