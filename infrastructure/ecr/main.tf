terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = { source = "hashicorp/aws"; version = "5.47.0" }
  }
}

provider "aws" { region = var.aws_region }

resource "aws_ecr_repository" "app" {
  name                 = "globe-timezone-app"
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration { scan_on_push = true }
  tags = { Project = "globe-timezone-app"; ManagedBy = "terraform" }
}

resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name
  policy = jsonencode({ rules = [
    { rulePriority = 1; description = "Retain 10 most recent tagged images"; selection = { tagStatus = "tagged"; tagPrefixList = ["v","sha-","latest"]; countType = "imageCountMoreThan"; countNumber = 10 }; action = { type = "expire" } },
    { rulePriority = 2; description = "Remove untagged images older than 7 days"; selection = { tagStatus = "untagged"; countType = "sinceImagePushed"; countUnit = "days"; countNumber = 7 }; action = { type = "expire" } }
  ] })
}
