#!/bin/bash
set -euo pipefail

KONG_ADMIN_URL="http://localhost:8001"
SERVICE_NAME="jongtao-dev"
SERVICE_HOST="jongtao-dev-web"
SERVICE_PORT=3002
ROUTE_HOST="dev.jongtao.me-prompt-technology.com"

echo "Creating Kong Service '$SERVICE_NAME'..."
curl -i -X POST "$KONG_ADMIN_URL/services/" \
  --data "name=$SERVICE_NAME" \
  --data "host=$SERVICE_HOST" \
  --data "port=$SERVICE_PORT" \
  --data "protocol=http"

echo -e "\n\nCreating Kong Route for '$ROUTE_HOST'..."
curl -i -X POST "$KONG_ADMIN_URL/services/$SERVICE_NAME/routes" \
  --data "name=${SERVICE_NAME}-route" \
  --data "hosts[]=$ROUTE_HOST" \
  --data "preserve_host=true"

echo -e "\n\nDone. Dev environment is accessible at: $ROUTE_HOST"
