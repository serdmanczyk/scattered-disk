resource "aws_dynamodb_table" "readings" {
  name         = "albion_readings"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "coreid"
  range_key    = "timestamp"

  attribute {
    name = "coreid"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }
}

resource "aws_dynamodb_table" "latest_readings" {
  name         = "albion_latest_readings"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "coreid"

  attribute {
    name = "coreid"
    type = "S"
  }
}
