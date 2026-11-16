resource "aws_vpc" "autoheal" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name    = "${var.project_name}-vpc"
    Project = "AutoHeal"
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.autoheal.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = var.availability_zone
  map_public_ip_on_launch = true

  tags = {
    Name    = "${var.project_name}-public-subnet"
    Project = "AutoHeal"
  }
}

resource "aws_internet_gateway" "autoheal" {
  vpc_id = aws_vpc.autoheal.id

  tags = {
    Name    = "${var.project_name}-igw"
    Project = "AutoHeal"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.autoheal.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.autoheal.id
  }

  tags = {
    Name    = "${var.project_name}-public-rt"
    Project = "AutoHeal"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# Jenkins security group
resource "aws_security_group" "jenkins" {
  name        = "${var.project_name}-jenkins-sg"
  description = "Security group for AutoHeal Jenkins"
  vpc_id      = aws_vpc.autoheal.id

  ingress {
    description = "SSH from authorized IP"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  ingress {
    description = "Jenkins web interface from authorized IP"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "${var.project_name}-jenkins-sg"
    Project = "AutoHeal"
  }
}

# K3s security group
resource "aws_security_group" "k3s" {
  name        = "${var.project_name}-k3s-sg"
  description = "Security group for AutoHeal K3s"
  vpc_id      = aws_vpc.autoheal.id

  ingress {
    description = "SSH from authorized IP"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  ingress {
    description = "Application HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Application HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description     = "Kubernetes API from Jenkins only"
    from_port       = 6443
    to_port         = 6443
    protocol        = "tcp"
    security_groups = [aws_security_group.jenkins.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "${var.project_name}-k3s-sg"
    Project = "AutoHeal"
  }
}
