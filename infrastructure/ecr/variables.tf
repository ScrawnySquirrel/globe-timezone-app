variable "aws_region" { description = "AWS region"; type = string; default = "us-west-2" }
variable "ci_role_arn" { description = "IAM role ARN for CI push"; type = string }
variable "orchestration_role_arns" { description = "IAM role ARNs for pull"; type = list(string); default = [] }
