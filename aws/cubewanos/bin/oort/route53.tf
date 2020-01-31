locals {
  apex_domain = "erdmanczyk.com"
  subdomain   = "cubewanos.erdmanczyk.com"
}

data "aws_route53_zone" "apex" {
  name = local.apex_domain
}

resource "aws_route53_zone" "oort" {
  name = local.subdomain
}

resource "aws_route53_record" "oort" {
  zone_id = data.aws_route53_zone.apex.zone_id
  name    = local.subdomain
  type    = "NS"
  ttl     = "30"

  records = [
    aws_route53_zone.oort.name_servers.0,
    aws_route53_zone.oort.name_servers.1,
    aws_route53_zone.oort.name_servers.2,
    aws_route53_zone.oort.name_servers.3,
  ]
}

resource "aws_acm_certificate" "oort" {
  domain_name       = local.subdomain
  validation_method = "DNS"

  options {
    certificate_transparency_logging_preference = "ENABLED"
  }
}

resource "aws_route53_record" "cert_validation" {
  name    = aws_acm_certificate.oort.domain_validation_options.0.resource_record_name
  type    = aws_acm_certificate.oort.domain_validation_options.0.resource_record_type
  zone_id = aws_route53_zone.oort.id
  records = [aws_acm_certificate.oort.domain_validation_options.0.resource_record_value]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "oort" {
  certificate_arn         = aws_acm_certificate.oort.arn
  validation_record_fqdns = [aws_route53_record.cert_validation.fqdn]
}

resource "aws_route53_record" "oort_alias" {
  name    = local.subdomain
  type    = "A"
  zone_id = aws_route53_zone.oort.id

  alias {
    evaluate_target_health = true
    name                   = aws_cloudfront_distribution.oort.domain_name
    zone_id                = aws_cloudfront_distribution.oort.hosted_zone_id
  }
}
