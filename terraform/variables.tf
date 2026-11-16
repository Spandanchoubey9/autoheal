variable "aws_region" {
  description = "AWS deployment region"
  type        = string
  default     = "us-east-1"
}

variable "availability_zone" {
  description = "AWS availability zone"
  type        = string
  default     = "us-east-1a"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "autoheal"
}

variable "allowed_ssh_cidr" {
  description = "Public IP allowed to SSH into EC2 instances"
  type        = string
}

variable "jenkins_instance_type" {
  type    = string
  default = "t3.small"
}

variable "k3s_instance_type" {
  type    = string
  default = "t3.small"
}

variable "key_name" {
  description = "AWS EC2 SSH key pair name"
  type        = string
  default     = "autoheal-key"
}

variable "ami_id" {
  description = "Ubuntu 24.04 AMI ID for us-east-1"
  type        = string
}

variable "root_volume_size" {
  description = "EC2 root volume size in GB"
  type        = number
  default     = 20
}
