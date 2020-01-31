#!/bin/bash

curl "https://$ALBION_DOMAIN/latest_reading?coreid=$ALBION_COREID" -o latest.json
cat latest.json | jq 
