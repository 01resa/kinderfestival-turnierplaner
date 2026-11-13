#!/bin/sh
# Health check script for Kinderfestival Turnierplaner

# Check if curl is available
if ! command -v curl >/dev/null 2>&1; then
    echo "curl not found"
    exit 1
fi

# Check if nginx is running and serving the app
HTTP_PORT=${NGINX_HTTP_PORT:-8080}
HTTPS_PORT=${NGINX_HTTPS_PORT:-8443}

# Try HTTP first
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$HTTP_PORT" | grep -q "200"; then
    echo "HTTP server is healthy"
    exit 0
fi

# Try HTTPS if enabled
if [ "$NGINX_ENABLE_HTTPS" = "true" ]; then
    if curl -k -s -o /dev/null -w "%{http_code}" "https://localhost:$HTTPS_PORT" | grep -q "200"; then
        echo "HTTPS server is healthy"
        exit 0
    fi
fi

# Check if nginx process is running
if pgrep nginx >/dev/null 2>&1; then
    echo "Nginx process is running but not responding"
    exit 1
fi

# Nginx is not running
echo "Nginx is not running"
exit 1
