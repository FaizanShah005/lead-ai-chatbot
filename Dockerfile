FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
# Set default CORS origin to * if not provided
ENV CORS_ORIGINS=*

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    postgresql-client \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy project
COPY . .

# Create a directory for nginx logs
RUN mkdir -p /var/log/nginx

# Expose port for Nginx
EXPOSE 80

# Start both Nginx and Gunicorn
CMD service nginx start && gunicorn --bind 127.0.0.1:5000 app:app 