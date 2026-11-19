# ---------------------------------------------------------
# APPLICATION LOAD BALANCER
# Provisions the public ALB, target groups, and HTTP/HTTPS listeners,
# routing traffic by host header to consumer (app.getrevoo.com) and backoffice (admin.getrevoo.com).
# ---------------------------------------------------------

resource "aws_lb" "main" {
  name               = "revoo-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = data.aws_subnets.default.ids
}
resource "aws_lb_target_group" "consumer" {
  name        = "revoo-consumer-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.default.id
  target_type = "ip"
  health_check {
    path    = "/"
    matcher = "200-399"
  }
}
resource "aws_lb_target_group" "backoffice" {
  name        = "revoo-backoffice-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.default.id
  target_type = "ip"
  health_check {
    path    = "/"
    matcher = "200-399"
  }
}

# Port 80 (HTTP) -> Redirects to Port 443 (HTTPS)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# Port 443 (HTTPS) -> Uses your *.getrevoo.com certificate
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = data.aws_acm_certificate.wildcard.arn
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.consumer.arn
  }
}

# Rule 1: Route admin.getrevoo.com -> Backoffice
resource "aws_lb_listener_rule" "backoffice_host" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 10
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backoffice.arn
  }
  condition {
    host_header {
      values = ["admin.getrevoo.com"]
    }
  }
}
# Rule 2: Route app.getrevoo.com -> Consumer
resource "aws_lb_listener_rule" "consumer_host" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 20
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.consumer.arn
  }
  condition {
    host_header {
      values = ["app.getrevoo.com"]
    }
  }
}
