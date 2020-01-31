package main

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"testing"

	"github.com/aws/aws-lambda-go/events"
)

func fakeHappyHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	return events.APIGatewayProxyResponse{
		Body:       request.Body,
		StatusCode: 200,
	}, nil
}

func fakeSadHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	return events.APIGatewayProxyResponse{
		Body:       "s'bad",
		StatusCode: 500,
	}, nil
}

func fakeHandlerBreaks(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	return events.APIGatewayProxyResponse{}, fmt.Errorf("oh no")
}

func TestHappyHandler(t *testing.T) {
	rt := newRouter()
	rt.handlers[requestType{method: "get", path: "something"}] = fakeHappyHandler
	rt.addAccessControlHandler(accessControl("https://chumbawumba.com"))

	ctx := context.Background()

	request := events.APIGatewayProxyRequest{
		Path:       "something",
		HTTPMethod: "get",
		Body:       "chumbawumba",
		Headers: map[string]string{
			"origin": "https://chumbawumba.com",
		},
	}
	response, err := rt.route(ctx, request)
	if err != nil {
		t.Errorf("Unexpected error received routing happy path: %v", err)
	}
	if response.Body != request.Body && response.StatusCode != 200 {
		t.Errorf("Route happy path failed")
	}
	accessControlHeader, ok := response.Headers["Access-Control-Allow-Headers"]
	if !ok || accessControlHeader != "Content-Type" {
		t.Errorf("Expected Access-Control-Allow-Headers:%s got %s", "Content-Type", accessControlHeader)
	}
}

func TestNotFoundHandler(t *testing.T) {
	rt := newRouter()

	ctx := context.Background()

	request := events.APIGatewayProxyRequest{
		Path:       "something",
		HTTPMethod: "get",
		Body:       "chumbawumba",
	}
	response, err := rt.route(ctx, request)
	if err != nil {
		t.Errorf("Unexpected error received routing unknown path: %v", err)
	}
	var expectedResponseBody strings.Builder

	json.NewEncoder(&expectedResponseBody).Encode(request)
	expectedBody := expectedResponseBody.String()
	if response.Body != expectedBody && response.StatusCode != 404 {
		t.Errorf("Route not found failed; expected response body %v, got %v", expectedBody, response.Body)
	}
}

func TestAccessControl(t *testing.T) {
	rt := newRouter()
	rt.handlers[requestType{method: "get", path: "something"}] = fakeHappyHandler
	rt.addAccessControlHandler(accessControl("https://chumbawumboooooooo.com"))

	ctx := context.Background()

	request := events.APIGatewayProxyRequest{
		Path:       "something",
		HTTPMethod: "get",
		Body:       "chumbawumba",
		Headers: map[string]string{
			"origin": "https://chumbawumba.com",
		},
	}
	response, err := rt.route(ctx, request)
	if err != nil {
		t.Errorf("Unexpected error received routing happy path: %v", err)
	}
	if response.Body != "" && response.StatusCode != 403 {
		t.Errorf("Expected access error, got %d:%s", response.StatusCode, response.Body)
	}
}
