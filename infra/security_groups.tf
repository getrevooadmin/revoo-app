# Configures network security groups to allow public HTTP/HTTPS traffic to the ALB
# and restrict ECS container access on port 3000 exclusively to traffic from the ALB.

resource "aws_security_group" "revoo_sg" {
  name        = "revoo-terraform-sg"
  description = "Allow HTTP traffic on port 3000"
  vpc_id      = data.aws_vpc.default.id
  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Security Group for the Load Balancer (Ports 80 and 443 open to internet)
resource "aws_security_group" "alb_sg" {
  name        = "revoo-alb-sg"
  description = "Allow public HTTP and HTTPS traffic to ALB"
  vpc_id      = data.aws_vpc.default.id
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 443
    to_port     = 443
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
