resource "aws_api_gateway_rest_api" "albion" {
  name = "albion"
}

// Handle '/*'
resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.albion.id
  parent_id   = aws_api_gateway_rest_api.albion.root_resource_id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "proxy" {
  rest_api_id   = aws_api_gateway_rest_api.albion.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "lambda" {
  rest_api_id = aws_api_gateway_rest_api.albion.id
  resource_id = aws_api_gateway_method.proxy.resource_id
  http_method = aws_api_gateway_method.proxy.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.albion.invoke_arn
}

// Handle '/'
resource "aws_api_gateway_method" "proxy_root" {
  rest_api_id   = aws_api_gateway_rest_api.albion.id
  resource_id   = aws_api_gateway_rest_api.albion.root_resource_id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "lambda_root" {
  rest_api_id = aws_api_gateway_rest_api.albion.id
  resource_id = aws_api_gateway_method.proxy_root.resource_id
  http_method = aws_api_gateway_method.proxy_root.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.albion.invoke_arn
}

resource "aws_api_gateway_deployment" "albion" {
  depends_on = [
    aws_api_gateway_integration.lambda,
    aws_api_gateway_integration.lambda_root,
  ]

  rest_api_id = aws_api_gateway_rest_api.albion.id
  stage_name  = "albion"
}

resource "aws_api_gateway_usage_plan" "albion" {
  name = "albion"

  api_stages {
    api_id = aws_api_gateway_rest_api.albion.id
    stage  = aws_api_gateway_deployment.albion.stage_name
  }
}

// Allow invoke of lambda
resource "aws_lambda_permission" "albion" {
  depends_on = [
    aws_api_gateway_deployment.albion,
  ]

  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.albion.function_name
  principal     = "apigateway.amazonaws.com"

  # The "/*/*" portion grants access from any method on any resource
  # within the API Gateway REST API.
  source_arn = "${aws_api_gateway_rest_api.albion.execution_arn}/*/*"
}

output "api_gateway_url" {
  value       = "https://${aws_api_gateway_deployment.albion.rest_api_id}.execute-api.${var.aws_region}.amazonaws.com/${aws_api_gateway_deployment.albion.stage_name}"
  description = "URL at which to invoke API"
}
