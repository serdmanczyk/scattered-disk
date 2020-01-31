locals {
  apex_domain = "erdmanczyk.com"
  ui_domain   = "cubewanos.erdmanczyk.com"
  subdomain   = "api.cubewanos.erdmanczyk.com"
}

data "aws_route53_zone" "apex" {
  name = local.apex_domain
}

data "aws_route53_zone" "ui" {
  name = local.ui_domain
}

resource "aws_route53_zone" "albion" {
  name = local.subdomain
}

resource "aws_route53_record" "albion" {
  zone_id = data.aws_route53_zone.ui.zone_id
  name    = local.subdomain
  type    = "NS"
  ttl     = "30"

  records = [
    aws_route53_zone.albion.name_servers.0,
    aws_route53_zone.albion.name_servers.1,
    aws_route53_zone.albion.name_servers.2,
    aws_route53_zone.albion.name_servers.3,
  ]
}

resource "aws_acm_certificate" "albion" {
  domain_name       = local.subdomain
  validation_method = "DNS"

  options {
    certificate_transparency_logging_preference = "ENABLED"
  }
}

resource "aws_route53_record" "cert_validation" {
  name    = aws_acm_certificate.albion.domain_validation_options.0.resource_record_name
  type    = aws_acm_certificate.albion.domain_validation_options.0.resource_record_type
  zone_id = aws_route53_zone.albion.id
  records = [aws_acm_certificate.albion.domain_validation_options.0.resource_record_value]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "albion" {
  certificate_arn         = aws_acm_certificate.albion.arn
  validation_record_fqdns = [aws_route53_record.cert_validation.fqdn]
}

resource "aws_api_gateway_domain_name" "albion" {
  certificate_arn = aws_acm_certificate_validation.albion.certificate_arn
  domain_name     = local.subdomain
}

resource "aws_route53_record" "albion_alias" {
  name    = aws_api_gateway_domain_name.albion.domain_name
  type    = "A"
  zone_id = aws_route53_zone.albion.id

  alias {
    evaluate_target_health = true
    name                   = aws_api_gateway_domain_name.albion.cloudfront_domain_name
    zone_id                = aws_api_gateway_domain_name.albion.cloudfront_zone_id
  }
}

resource "aws_api_gateway_base_path_mapping" "test" {
  api_id      = aws_api_gateway_rest_api.albion.id
  stage_name  = aws_api_gateway_deployment.albion.stage_name
  domain_name = aws_api_gateway_domain_name.albion.domain_name
}
