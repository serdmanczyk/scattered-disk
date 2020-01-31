locals {
  web_page_domain      = "https://cubewanos.erdmanczyk.com"
  test_domain          = "https://localhost"
  unsecure_test_domain = "http://localhost"
  allowed_origins      = [local.web_page_domain, local.test_domain, local.unsecure_test_domain]
}

data "archive_file" "albion" {
  type        = "zip"
  source_dir  = "src/package/"
  output_path = "albion.zip"
}

resource "aws_lambda_function" "albion" {
  function_name = "albion"

  filename         = data.archive_file.albion.output_path
  source_code_hash = data.archive_file.albion.output_base64sha256
  timeout          = 60

  handler = "albion"
  runtime = "go1.x"

  role = aws_iam_role.albion.arn

  environment {
    variables = {
      DYNAMODB_READINGS_TABLE_NAME        = aws_dynamodb_table.readings.name
      DYNAMODB_LATEST_READINGS_TABLE_NAME = aws_dynamodb_table.latest_readings.name
      ALLOWED_ORIGINS                     = join(",", local.allowed_origins)
    }
  }
}

resource "aws_cloudwatch_log_group" "albion" {
  name              = "/aws/lambda/albion"
  retention_in_days = 30
}
