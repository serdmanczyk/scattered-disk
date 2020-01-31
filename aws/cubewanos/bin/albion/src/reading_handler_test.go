package main

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/aws/aws-lambda-go/events"
)

type fakeReadingStore struct {
	latestReading  Reading
	archiveReading Reading
}

func (frs *fakeReadingStore) storeLatestReading(r Reading) (err error) {
	frs.latestReading = r
	return
}

func (frs *fakeReadingStore) storeArchiveReading(r Reading) (err error) {
	frs.archiveReading = r
	return
}

func (frs *fakeReadingStore) getLatestReading(coreid string) (Reading, error) {
	return frs.latestReading, nil
}

func (frs *fakeReadingStore) getReadings(string, time.Time, time.Time) ([]Reading, error) {
	var readings []Reading
	readings = append(readings, frs.archiveReading)
	return readings, nil
}

func TestGetReadingHappyPath(t *testing.T) {
	fakeReading := Reading{
		CoreID:    "fcoreid",
		Timestamp: time.Unix(100, 0),
	}
	fakeStore := &fakeReadingStore{
		latestReading:  fakeReading,
		archiveReading: fakeReading,
	}

	handler := getReadingsHandler(fakeStore)
	request := events.APIGatewayProxyRequest{
		QueryStringParameters: map[string]string{
			"coreid":    "yourmoms",
			"startTime": "100",
			"endTime":   "1575180579",
		},
	}
	ctx := context.Background()
	resp, err := handler(ctx, request)
	if err != nil {
		t.Fatal(err)
	}

	var respReadings []Reading
	err = json.Unmarshal([]byte(resp.Body), &respReadings)
	if err != nil {
		t.Fatal(err)
	}

	got := respReadings[0]
	expected := fakeStore.archiveReading
	if got != expected {
		t.Fatalf("got %v; expected %v", got, expected)
	}
}

func TestGetReadingMissingParam(t *testing.T) {
	ctx := context.Background()
	testCases := []struct {
		params           map[string]string
		expectedStrInErr string
	}{
		{
			params:           map[string]string{"coreid": "yourmom", "startTime": "100"},
			expectedStrInErr: "endTime not provided",
		},
		{
			params:           map[string]string{"coreid": "yourmom"},
			expectedStrInErr: "startTime not provided",
		},
		{
			params:           map[string]string{},
			expectedStrInErr: "coreid not provided",
		},
		{
			params:           map[string]string{"coreid": "yourmom", "startTime": "2CEF"},
			expectedStrInErr: "startTime not a valid number",
		},
		{
			params:           map[string]string{"coreid": "yourmom", "startTime": "3000", "endTime": "2000"},
			expectedStrInErr: "startTime must be before endTime",
		},
	}
	for _, testCase := range testCases {
		handler := getReadingsHandler(&fakeReadingStore{
			latestReading:  Reading{},
			archiveReading: Reading{},
		})
		request := events.APIGatewayProxyRequest{
			QueryStringParameters: testCase.params,
		}
		resp, err := handler(ctx, request)
		if err != nil {
			t.Fatal(err)
		}

		expectedStatusCode := 400
		if resp.StatusCode != expectedStatusCode {
			t.Errorf("Expected status %d; got %d", expectedStatusCode, resp.StatusCode)
		}

		if !strings.Contains(resp.Body, testCase.expectedStrInErr) {
			t.Errorf("Expected error with string '%s'; got %s", testCase.expectedStrInErr, resp.Body)
		}
	}
}
