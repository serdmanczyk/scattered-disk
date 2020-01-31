package main

import (
	"testing"
	"time"
)

var (
	sampleEvent     string  = `{"event":"Reading","data":"{\"temperature\": 66.470,\"humidity\": 57.218,\"pressure\": 994,\"voc\": 28,\"battery\": 4.010,\"timestamp\": \"2019-11-26T18:45:44Z\"}","published_at":"2019-11-26T18:45:49.956Z","coreid":"e00fce68402ff02444f78689"}`
	expectedReading Reading = Reading{
		Temperature: 66.470,
		CoreID:      "e00fce68402ff02444f78689",
		PublishedAt: time.Date(2019, 11, 26, 18, 45, 49, 956000000, time.UTC),
		Humidity:    57.218,
		Pressure:    994,
		VOC:         28,
		Battery:     4.01,
		Timestamp:   time.Date(2019, 11, 26, 18, 45, 44, 0, time.UTC),
	}
)

// TestParseSensorData tests parsing of sensor data into struct
func TestParseSensorData(t *testing.T) {
	reading, err := readingFromSensorEvent(sampleEvent)
	if err != nil {
		t.Errorf("Error parsing sensor event: %v", err)
		return
	}

	if reading != expectedReading {
		t.Errorf("Got %v; expected %v", reading, expectedReading)
	}
}
