# Register the local SSH public key with AWS
resource "aws_key_pair" "autoheal" {
  key_name   = var.key_name
  public_key = file(pathexpand("~/.ssh/autoheal-aws.pub"))

  tags = {
    Name    = var.key_name
    Project = "AutoHeal"
  }
}

# Jenkins EC2 instance
resource "aws_instance" "jenkins" {
  ami                         = var.ami_id
  instance_type               = var.jenkins_instance_type
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.jenkins.id]
  key_name                    = aws_key_pair.autoheal.key_name
  iam_instance_profile        = aws_iam_instance_profile.jenkins.name
  associate_public_ip_address = true

  root_block_device {
    volume_size           = var.root_volume_size
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
  }

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  tags = {
    Name    = "${var.project_name}-jenkins"
    Project = "AutoHeal"
    Role    = "CI-CD"
  }
}

# K3s EC2 instance
resource "aws_instance" "k3s" {
  ami                         = var.ami_id
  instance_type               = var.k3s_instance_type
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.k3s.id]
  key_name                    = aws_key_pair.autoheal.key_name
  iam_instance_profile        = aws_iam_instance_profile.k3s.name
  associate_public_ip_address = true

  root_block_device {
    volume_size           = var.root_volume_size
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
  }

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  tags = {
    Name    = "${var.project_name}-k3s"
    Project = "AutoHeal"
    Role    = "Application-Cluster"
  }
}
