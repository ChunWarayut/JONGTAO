#!/bin/bash

KONG_ADMIN_URL="http://localhost:8001"
SERVICE_NAME="jongtao"
SERVICE_HOST="jongtao-web-1"
SERVICE_PORT=3001
ROUTE_HOST="jongtao.me-prompt-technology.com"

echo "Creating Kong Service '$SERVICE_NAME'..."
curl -i -X POST $KONG_ADMIN_URL/services/ \
  --data "name=$SERVICE_NAME" \
  --data "host=$SERVICE_HOST" \
  --data "port=$SERVICE_PORT" \
  --data "protocol=http"

echo -e "\n\nCreating Kong Route for '$ROUTE_HOST'..."
curl -i -X POST $KONG_ADMIN_URL/services/$SERVICE_NAME/routes \
  --data "name=$SERVICE_NAME-route" \
  --data "hosts[]=$ROUTE_HOST" \
  --data "preserve_host=true"

echo -e "\n\nDone."
