# output "oai_principal" {
#     value = "${aws_cloudfront_origin_access_identity.oort.iam_arn}"
# }

resource "aws_cloudfront_origin_access_identity" "oort" {
}

resource "aws_cloudfront_distribution" "oort" {
  aliases = [local.subdomain]
  origin {
    domain_name = aws_s3_bucket.oort.bucket_domain_name
    origin_id   = aws_s3_bucket.oort.bucket_domain_name

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oort.cloudfront_access_identity_path
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "/index.html"

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  default_cache_behavior {
    allowed_methods = [
      "GET",
      "HEAD",
      "OPTIONS"
    ]
    cached_methods = [
      "GET",
      "HEAD",
      "OPTIONS"
    ]

    forwarded_values {
      cookies {
        forward = "none"
      }

      query_string = true
    }
    default_ttl            = 3600
    max_ttl                = 86400
    min_ttl                = 60
    target_origin_id       = aws_s3_bucket.oort.bucket_domain_name
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
  }

  price_class = "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "whitelist"
      locations        = ["US"]
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.oort.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.1_2016"
  }
}
