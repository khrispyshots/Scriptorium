#!/bin/bash

echo "Running database migrations..."
php artisan migrate --force

echo "Starting production server..."
php artisan serve --host 0.0.0.0 --port $PORT
