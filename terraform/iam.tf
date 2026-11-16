# EC2 trust policy
data "aws_iam_policy_document" "ec2_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

# Jenkins EC2 IAM role
resource "aws_iam_role" "jenkins" {
  name               = "${var.project_name}-jenkins-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume_role.json
}

# Jenkins ECR push and pull permissions
resource "aws_iam_role_policy" "jenkins_ecr" {
  name = "${var.project_name}-jenkins-ecr-policy"
  role = aws_iam_role.jenkins.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:DescribeRepositories"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:CompleteLayerUpload",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:PutImage",
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer",
          "ecr:DescribeImages"
        ]
        Resource = [
          aws_ecr_repository.backend.arn,
          aws_ecr_repository.frontend.arn
        ]
      }
    ]
  })
}

# Jenkins EC2 instance profile
resource "aws_iam_instance_profile" "jenkins" {
  name = "${var.project_name}-jenkins-profile"
  role = aws_iam_role.jenkins.name
}

# K3s EC2 IAM role
resource "aws_iam_role" "k3s" {
  name               = "${var.project_name}-k3s-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume_role.json
}

# K3s ECR pull permissions
resource "aws_iam_role_policy" "k3s_ecr" {
  name = "${var.project_name}-k3s-ecr-policy"
  role = aws_iam_role.k3s.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchCheckLayerAvailability"
        ]
        Resource = [
          aws_ecr_repository.backend.arn,
          aws_ecr_repository.frontend.arn
        ]
      }
    ]
  })
}

resource "aws_iam_instance_profile" "k3s" {
  name = "${var.project_name}-k3s-profile"
  role = aws_iam_role.k3s.name
}
