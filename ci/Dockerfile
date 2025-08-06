FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  ffmpeg \
  curl \
  && rm -rf /var/lib/apt/lists/*

# Copy only requirements first to leverage Docker cache
COPY requirements.txt .
COPY pyproject.toml .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir gunicorn

# Copy the rest of the application
COPY server/ /app/server/
COPY extraction_rules.json .

# Create directories
RUN mkdir -p /data/downloads /data/logs

# Set environment variables
ENV PYTHONPATH=/app
ENV DOWNLOAD_DIR=/data/downloads
ENV LOG_DIR=/data/logs
ENV SERVER_HOST=0.0.0.0
# Use centralized port configuration
ENV SERVER_PORT=5010

# Expose the server port
EXPOSE 5010

# Set up volumes for persistent data
VOLUME ["/data/downloads", "/data/logs"]

# Run gunicorn with 4 workers
CMD ["gunicorn", "--workers=4", "--bind=0.0.0.0:5010", "server:create_app()"]

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  # Use centralized port configuration for health check
  CMD curl -f http://localhost:5010/health || exit 1
