data "aws_iam_policy_document" "lambda" {
  statement {
    actions = ["sts:AssumeRole"]
    effect  = "Allow"
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
  version = "2012-10-17"
}

resource "aws_iam_role" "albion" {
  name = "albion_lambda_role"

  assume_role_policy = data.aws_iam_policy_document.lambda.json
}

data "aws_iam_policy_document" "lambda_access_dynamodb_readings" {
  statement {
    actions = [
      "dynamodb:Query",
      "dynamodb:Scan",
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
    ]
    effect = "Allow"
    resources = [
      aws_dynamodb_table.readings.arn
    ]
  }
  version = "2012-10-17"
}

data "aws_iam_policy_document" "lambda_access_dynamodb_latest_readings" {
  statement {
    actions = [
      "dynamodb:Query",
      "dynamodb:Scan",
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
    ]
    effect = "Allow"
    resources = [
      aws_dynamodb_table.latest_readings.arn
    ]
  }
  version = "2012-10-17"
}


data "aws_iam_policy_document" "lambda_access_cloudwatch" {
  statement {
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = [
      aws_cloudwatch_log_group.albion.arn
    ]
  }
  version = "2012-10-17"
}

resource "aws_iam_policy" "lambda_access_dynamodb_readings" {
  name        = "albion_lambda_access_dynamodb_readings"
  description = "Allow albion to access full readings table"

  policy = data.aws_iam_policy_document.lambda_access_dynamodb_readings.json
}

resource "aws_iam_policy" "lambda_access_dynamodb_latest_readings" {
  name        = "albion_lambda_access_dynamodb_latest_readings"
  description = "Allow albion to access latest readings table"

  policy = data.aws_iam_policy_document.lambda_access_dynamodb_latest_readings.json
}

resource "aws_iam_policy" "lambda_access_cloudwatch" {
  name        = "albion_lambda_access_cloudwatch"
  description = "Allow albion to access Cloudwatch logs"

  policy = data.aws_iam_policy_document.lambda_access_cloudwatch.json
}

resource "aws_iam_role_policy_attachment" "lambda_access_dynamodb_readings" {
  role       = aws_iam_role.albion.name
  policy_arn = aws_iam_policy.lambda_access_dynamodb_readings.arn
}

resource "aws_iam_role_policy_attachment" "lambda_access_dynamodb_latest_readings" {
  role       = aws_iam_role.albion.name
  policy_arn = aws_iam_policy.lambda_access_dynamodb_latest_readings.arn
}

resource "aws_iam_role_policy_attachment" "lambda_access_cloudwatch" {
  role       = aws_iam_role.albion.name
  policy_arn = aws_iam_policy.lambda_access_cloudwatch.arn
}
