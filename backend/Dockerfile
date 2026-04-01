# MR Bus Portal — Backend Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for Docker layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Cloud Run uses PORT env variable
ENV PORT=8080
EXPOSE 8080

# Run with gunicorn for production
CMD exec uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 2
