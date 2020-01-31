#!/bin/bash
curl "https://$ALBION_DOMAIN/readings?coreid=$ALBION_COREID&startTime=0&endTime=$(date +%s)" -o readings.json
cat readings.json | jq
