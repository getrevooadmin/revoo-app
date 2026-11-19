# Exports infrastructure output values such as the public DNS name of the Application Load Balancer.

output "alb_dns_name" {
  value = aws_lb.main.dns_name
}
