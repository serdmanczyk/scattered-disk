package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"strings"

	"github.com/aws/aws-lambda-go/events"
)

type requestType struct {
	method string
	path   string
}

type requestHandler func(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error)
type accessControlHandler func(ctx context.Context, request events.APIGatewayProxyRequest) (map[string]string, error)

type router struct {
	handlers              map[requestType]requestHandler
	accessControlHandlers []accessControlHandler
}

func (h *router) addAccessControlHandler(ah accessControlHandler) {

	h.accessControlHandlers = append(h.accessControlHandlers, ah)
}

func newRouter() *router {
	return &router{
		handlers:              make(map[requestType]requestHandler),
		accessControlHandlers: make([]accessControlHandler, 0, 5),
	}
}

func (h *router) route(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	log.Printf("Received request %v", request)
	p := strings.ToLower(request.Path)
	m := strings.ToLower(request.HTTPMethod)
	rt := requestType{
		path:   p,
		method: m,
	}
	handler, ok := h.handlers[rt]
	if !ok {
		log.Printf("Handler not found for %s %s", m, p)
		return notFoundHandler(ctx, request)
	}

	log.Printf("Handler found for %s %s", m, p)
	var accessHeaders map[string]string
	for _, accessHandler := range h.accessControlHandlers {
		headers, err := accessHandler(ctx, request)
		if err != nil {
			log.Printf("Access control error: %s", err.Error())
			return events.APIGatewayProxyResponse{StatusCode: 403}, nil
		}
		accessHeaders = addHeaders(accessHeaders, headers)
	}
	resp, err := handler(ctx, request)
	resp.Headers = addHeaders(resp.Headers, accessHeaders)
	return resp, err
}

func withAuth(rh requestHandler) requestHandler {
	return func(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
		// Primitive, but simple: if no API key provided and/or the API key
		// provided doesn't belong to this account APIKeyID is empty string.
		if request.RequestContext.Identity.APIKeyID == "" {
			log.Println("Request missing authorization")
			return events.APIGatewayProxyResponse{
				Body:       "{\"error\": \"request not authorized\"}",
				StatusCode: 403,
			}, nil
		}

		return rh(ctx, request)
	}
}

func notFoundHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	var b strings.Builder

	json.NewEncoder(&b).Encode(request)
	return events.APIGatewayProxyResponse{
		Body:       b.String(),
		StatusCode: 404,
	}, nil
}

func accessControl(allowedOrigins string) accessControlHandler {
	log.Printf("allowedOrigins: %s", allowedOrigins)
	allowedOriginsList := strings.Split(allowedOrigins, ",")
	for i, origin := range allowedOriginsList {
		allowedOriginsList[i] = strings.Trim(origin, " ")
	}

	return func(ctx context.Context, request events.APIGatewayProxyRequest) (map[string]string, error) {
		origin, ok := request.Headers["origin"]
		if !ok {
			return nil, nil
		}
		for _, allowedOrigin := range allowedOriginsList {
			if strings.HasPrefix(origin, allowedOrigin) {
				return map[string]string{
					"Access-Control-Allow-Headers": "Content-Type",
					"Access-Control-Allow-Origin":  origin,
				}, nil
			}
		}
		return nil, errors.New("origin not in allowed list")
	}
}
