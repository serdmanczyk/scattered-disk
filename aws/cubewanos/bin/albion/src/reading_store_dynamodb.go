package main

import (
	"log"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
	"github.com/aws/aws-sdk-go/service/dynamodb/expression"
)

type dynamoDBReadingStore struct {
	readingsTableName       string
	latestReadingsTableName string
	svc                     *dynamodb.DynamoDB
}

func (d dynamoDBReadingStore) store(tableName string, reading Reading) error {
	av, err := dynamodbattribute.MarshalMap(reading)
	if err != nil {
		return err
	}

	input := &dynamodb.PutItemInput{
		Item:      av,
		TableName: aws.String(tableName),
	}

	_, err = d.svc.PutItem(input)
	if err != nil {
		return err
	}

	return nil
}

func (d dynamoDBReadingStore) storeArchiveReading(reading Reading) error {
	return d.store(d.readingsTableName, reading)
}

func (d dynamoDBReadingStore) storeLatestReading(reading Reading) error {
	return d.store(d.latestReadingsTableName, reading)
}

func (d dynamoDBReadingStore) getLatestReading(coreid string) (Reading, error) {
	reading := Reading{}

	result, err := d.svc.GetItem(&dynamodb.GetItemInput{
		TableName: aws.String(d.latestReadingsTableName),
		Key: map[string]*dynamodb.AttributeValue{
			"coreid": {
				S: aws.String(coreid),
			},
		},
	})
	if err != nil {
		return reading, err
	}

	err = dynamodbattribute.UnmarshalMap(result.Item, &reading)
	if err != nil {
		return reading, err
	}

	return reading, nil
}

func (d dynamoDBReadingStore) getReadings(coreid string, start, end time.Time) ([]Reading, error) {
	var readings []Reading

	filt := expression.Name("coreid").Equal(expression.Value(coreid))
	filt = filt.And(expression.Name("timestamp").GreaterThanEqual(expression.Value(start)))
	filt = filt.And(expression.Name("timestamp").LessThanEqual(expression.Value(end)))

	// TODO: build via reflection?
	proj := expression.NamesList(
		expression.Name("timestamp"),
		expression.Name("coreid"),
		expression.Name("published_at"),
		expression.Name("temperature"),
		expression.Name("humidity"),
		expression.Name("pressure"),
		expression.Name("voc"),
		expression.Name("battery"),
	)
	expr, err := expression.
		NewBuilder().
		WithFilter(filt).
		WithProjection(proj).
		Build()

	params := &dynamodb.ScanInput{
		ExpressionAttributeNames:  expr.Names(),
		ExpressionAttributeValues: expr.Values(),
		FilterExpression:          expr.Filter(),
		ProjectionExpression:      expr.Projection(),
		TableName:                 aws.String(d.readingsTableName),
	}

	log.Printf("DynamoDB scan input: %v", params)
	var lastError error
	scanFunc := func(result *dynamodb.ScanOutput, lastPage bool) bool {
		for _, item := range result.Items {
			reading := Reading{}
			err = dynamodbattribute.UnmarshalMap(item, &reading)
			if err != nil {
				lastError = err
				return false
			}

			readings = append(readings, reading)
		}
		return true
	}

	err = d.svc.ScanPages(params, scanFunc)
	if err != nil {
		return readings, err
	}

	if lastError != nil {
		return readings, lastError
	}

	return readings, nil
}
