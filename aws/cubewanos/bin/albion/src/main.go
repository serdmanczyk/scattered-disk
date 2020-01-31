package main

import (
	"log"
	"os"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/dynamodb"
)

var (
	envReadingsTableName       string = "DYNAMODB_READINGS_TABLE_NAME"
	envLatestReadingsTableName string = "DYNAMODB_LATEST_READINGS_TABLE_NAME"
	envAllowedOrigins          string = "ALLOWED_ORIGINS"
)

func main() {
	sess := session.Must(session.NewSessionWithOptions(session.Options{
		SharedConfigState: session.SharedConfigEnable,
	}))

	dynamodb := dynamodb.New(sess)
	store := dynamoDBReadingStore{
		readingsTableName:       os.Getenv(envReadingsTableName),
		latestReadingsTableName: os.Getenv(envLatestReadingsTableName),
		svc:                     dynamodb,
	}

	log.Printf("DynamoDB store %v", store)
	rt := newRouter()

	rt.addAccessControlHandler(accessControl(os.Getenv(envAllowedOrigins)))

	rt.handlers[requestType{method: "post", path: "/reading"}] = withAuth(postReadingHandler(store))
	rt.handlers[requestType{method: "post", path: "/readings"}] = withAuth(postReadingsHandler(store))
	rt.handlers[requestType{method: "get", path: "/readings"}] = getReadingsHandler(store)
	rt.handlers[requestType{method: "get", path: "/latest_reading"}] = getLatestReadingHandler(store)

	lambda.Start(rt.route)
}
