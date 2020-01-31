package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/events"
)

type readingStore interface {
	storeArchiveReading(Reading) error
	storeLatestReading(Reading) error
	getLatestReading(coreid string) (Reading, error)
	getReadings(string, time.Time, time.Time) ([]Reading, error)
}

func resp(body string, statusCode int) events.APIGatewayProxyResponse {
	return events.APIGatewayProxyResponse{
		Body:       body,
		StatusCode: statusCode,
	}
}

func postReadingsHandler(store readingStore) requestHandler {
	return func(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
		log.Println("Handle POST /readings request")

		var readings []Reading
		if err := json.Unmarshal([]byte(request.Body), &readings); err != nil {
			errorMsg := fmt.Sprintf("Error parsing sensor event: %v", err)
			return resp(errorMsg, 400), nil
		}

		for _, reading := range readings {
			err := store.storeArchiveReading(reading)
			if err != nil {
				errorMsg := fmt.Sprintf("Error storing sensor event: %v", err)
				log.Println(errorMsg)
				return resp(errorMsg, 500), nil
			}
		}

		return events.APIGatewayProxyResponse{StatusCode: 200}, nil
	}
}

func postReadingHandler(store readingStore) requestHandler {
	return func(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
		log.Println("Handle POST /reading request")
		reading, err := readingFromSensorEvent(request.Body)
		if err != nil {
			errorMsg := fmt.Sprintf("Error parsing sensor event: %v", err)
			log.Println(errorMsg)
			return resp(errorMsg, 400), nil
		}

		err = store.storeArchiveReading(reading)
		if err != nil {
			errorMsg := fmt.Sprintf("Error storing archive sensor event: %v", err)
			log.Println(errorMsg)
			return resp(errorMsg, 500), nil
		}

		err = store.storeLatestReading(reading)
		if err != nil {
			errorMsg := fmt.Sprintf("Error storing latest sensor event: %v", err)
			log.Println(errorMsg)
			return resp(errorMsg, 500), nil
		}

		return events.APIGatewayProxyResponse{StatusCode: 200}, nil
	}
}

func getTimeParameter(request events.APIGatewayProxyRequest, paramName string) (t time.Time, err error) {
	timeStr, ok := request.QueryStringParameters[paramName]
	if !ok {
		err = fmt.Errorf("%s not provided", paramName)
		return
	}
	timeInt, err := strconv.Atoi(timeStr)
	if err != nil {
		err = fmt.Errorf("%s not a valid number (expected unix timestamp(ms))", paramName)
		return
	}

	t = time.Unix(int64(timeInt), 0)
	return
}

func parseGetReadingParameters(request events.APIGatewayProxyRequest) (coreid string, startTime, endTime time.Time, err error) {
	coreid, ok := request.QueryStringParameters["coreid"]
	if !ok {
		err = errors.New("coreid not provided")
		return
	}

	startTime, err = getTimeParameter(request, "startTime")
	if err != nil {
		return
	}
	endTime, err = getTimeParameter(request, "endTime")
	if err != nil {
		return
	}

	if endTime.Before(startTime) {
		err = errors.New("startTime must be before endTime")
		return
	}

	return coreid, startTime, endTime, nil
}

func getReadingsHandler(store readingStore) requestHandler {
	return func(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
		log.Println("Handle GET /readings request")
		coreid, startTime, endTime, err := parseGetReadingParameters(request)
		if err != nil {
			log.Println(err.Error())
			return resp(err.Error(), 400), nil
		}
		log.Printf("Fetching readings for coreid %s; start %v end %v", coreid, startTime, endTime)
		readings, err := store.getReadings(coreid, startTime, endTime)
		if err != nil {
			// TODO: wat if it's our fault?
			log.Println(err.Error())
			return resp(err.Error(), 400), nil
		}
		if len(readings) == 0 {
			return resp("{\"error\": \"No readings found\"}", 404), nil
		}
		var b strings.Builder

		json.NewEncoder(&b).Encode(readings)
		return resp(b.String(), 200), nil
	}
}

func getLatestReadingHandler(store readingStore) requestHandler {
	return func(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
		log.Println("Handle GET /latest_reading request")
		coreid, ok := request.QueryStringParameters["coreid"]
		if !ok {
			errorMsg := "coreid not provided"
			log.Println(errorMsg)
			return resp(errorMsg, 400), nil
		}
		log.Printf("Fetching latest reading for coreid %s", coreid)
		reading, err := store.getLatestReading(coreid)
		if err != nil {
			// TODO: wat if it's our fault?
			log.Println(err.Error())
			return resp(err.Error(), 400), nil
		}

		if reading.CoreID == "" {
			errorMsg := fmt.Sprintf("Latest reading for coreid %s not found", coreid)
			log.Println(errorMsg)
			return resp(errorMsg, 404), nil
		}

		var b strings.Builder
		json.NewEncoder(&b).Encode(reading)
		return resp(b.String(), 200), nil
	}
}
