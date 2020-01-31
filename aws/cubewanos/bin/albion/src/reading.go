package main

import (
	"encoding/json"
	"time"
)

// SensorData represents the data formatted and published via the sensor
type SensorData struct {
	Temperature float64   `json:"temperature"`
	Humidity    float64   `json:"humidity"`
	Pressure    int64     `json:"pressure"`
	VOC         int64     `json:"voc"`
	Battery     float64   `json:"battery"`
	Timestamp   time.Time `json:"timestamp"`
}

// SensorEvent represents the 'event' published from Particle webhook
type SensorEvent struct {
	EventName        string    `json:"event"`
	PublishedAt      time.Time `json:"published_at"`
	CoreID           string    `json:"coreid"`
	SensorDataString string    `json:"data"`
}

// Reading is SensorEvent distilled to what we care about
type Reading struct {
	Timestamp   time.Time `json:"timestamp"`
	CoreID      string    `json:"coreid"`
	PublishedAt time.Time `json:"published_at"`
	Temperature float64   `json:"temperature"`
	Humidity    float64   `json:"humidity"`
	Pressure    int64     `json:"pressure"`
	VOC         int64     `json:"voc"`
	Battery     float64   `json:"battery"`
}

func readingFromSensorEvent(body string) (Reading, error) {
	var event SensorEvent
	var data SensorData
	var reading Reading

	if err := json.Unmarshal([]byte(body), &event); err != nil {
		return reading, err
	}

	if err := json.Unmarshal([]byte(event.SensorDataString), &data); err != nil {
		return reading, err
	}

	return Reading{
		Timestamp:   data.Timestamp,
		CoreID:      event.CoreID,
		PublishedAt: event.PublishedAt,
		Temperature: data.Temperature,
		Humidity:    data.Humidity,
		Pressure:    data.Pressure,
		VOC:         data.VOC,
		Battery:     data.Battery,
	}, nil
}
