package main

import (
	"testing"
)

func TestAddHeaders(t *testing.T) {
	a := map[string]string{
		"a": "a",
	}
	b := map[string]string{
		"b": "b",
	}
	expected := map[string]string{
		"a": "a",
		"b": "b",
	}

	c := addHeaders(a, b)
	for k, v := range expected {
		value, ok := c[k]
		if !ok {
			t.Errorf("Missing value for key %s", k)
		}

		if value != v {
			t.Errorf("Expected value for key %s:%s; got: %s", k, v, value)
		}
	}
}

func testAddHeadersErrorCases(t *testing.T) {
	var a map[string]string
	var b map[string]string

	c := addHeaders(a, b)
	if c != nil {
		t.Errorf("Expected nil map got %v", c)
	}
}

func testAddHeadersNilSource(t *testing.T) {
	var a map[string]string
	expected := map[string]string{
		"a": "a",
	}

	c := addHeaders(a, expected)

	for k, v := range expected {
		value, ok := c[k]
		if !ok {
			t.Errorf("Missing value for key %s", k)
		}

		if value != v {
			t.Errorf("Expected value for key %s:%s; got: %s", k, v, value)
		}
	}
}
