output "vpc_id" {
  description = "AutoHeal VPC ID"
  value       = aws_vpc.autoheal.id
}

output "jenkins_public_ip" {
  description = "Public IP of Jenkins EC2"
  value       = aws_instance.jenkins.public_ip
}

output "k3s_public_ip" {
  description = "Public IP of K3s EC2"
  value       = aws_instance.k3s.public_ip
}

output "jenkins_url" {
  description = "Jenkins web interface"
  value       = "http://${aws_instance.jenkins.public_ip}:8080"
}

output "backend_ecr_url" {
  description = "Backend ECR repository URL"
  value       = aws_ecr_repository.backend.repository_url
}

output "frontend_ecr_url" {
  description = "Frontend ECR repository URL"
  value       = aws_ecr_repository.frontend.repository_url
}
