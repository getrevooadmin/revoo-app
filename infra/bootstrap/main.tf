# Bootstraps foundational AWS infrastructure: the S3 bucket for Terraform remote state,
# the GitHub Actions OIDC provider and IAM role for keyless CI/CD, and the wildcard ACM SSL certificate.

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket       = "revoo-terraform-state-243478201778"
    key          = "bootstrap/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
  }
}

provider "aws" {
  region = "us-east-1"
  #   profile = "revoo" # local machine aws profile, since it will be run from local
}

# ---------------------------------------------------------
# 1. ENTERPRISE S3 TERRAFORM STATE BUCKET
# ---------------------------------------------------------

resource "aws_s3_bucket" "terraform_state" {
  bucket = "revoo-terraform-state-243478201778"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket                  = aws_s3_bucket.terraform_state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ---------------------------------------------------------
# 2. GITHUB ACTIONS OIDC PROVIDER & IAM ROLE (KEYLESS!)
# ---------------------------------------------------------

resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1b511abead59c6ce207077c0bf0e0043b1382612"
  ]
}

resource "aws_iam_role" "github_actions" {
  name = "revoo-github-actions-oidc-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            # ONLY allows your specific GitHub repo to assume this role!
            "token.actions.githubusercontent.com:sub" = [
              "repo:getrevooadmin/revoo-app:*",
              "repo:getrevooadmin@*/revoo-app@*:*"
            ]
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "github_actions_admin" {
  role       = aws_iam_role.github_actions.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

# =============================================================================
# STEP C: WILDCARD SSL CERTIFICATE (*.getrevoo.com) IN AWS ACM
# =============================================================================

# Request a free wildcard SSL certificate that covers ALL subdomains (*.getrevoo.com)
resource "aws_acm_certificate" "wildcard" {
  domain_name       = "*.getrevoo.com"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "revoo-wildcard-cert"
  }
}


# ---------------------------------------------------------
# 3. OUTPUTS
# ---------------------------------------------------------
output "state_bucket_name" {
  value = aws_s3_bucket.terraform_state.bucket
}
output "github_oidc_role_arn" {
  value = aws_iam_role.github_actions.arn
}
# Print the exact CNAME record you need to paste into Spaceship DNS
output "acm_validation_cname" {
  value = {
    for dvo in aws_acm_certificate.wildcard.domain_validation_options : dvo.domain_name => {
      cname_host  = dvo.resource_record_name
      cname_value = dvo.resource_record_value
    }
  }
}

output "acm_certificate_arn" {
  value = aws_acm_certificate.wildcard.arn
}
