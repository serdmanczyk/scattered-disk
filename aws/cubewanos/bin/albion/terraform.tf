terraform {
  required_version = "~>0.12.0"
}

# Configure the AWS Provider
provider "aws" {
  region  = var.aws_region
  version = "~> 2.0"
}

provider "archive" {
  version = "~> 1.0"
}
