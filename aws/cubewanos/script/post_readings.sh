#!/bin/bash
curl -v -X POST "https://$ALBION_DOMAIN/albion/readings" -d "@readings.json" -H "x-api-key: $ALBION_API_KEY"
