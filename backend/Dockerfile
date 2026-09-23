# Use the official Python image.
FROM python:3.11-slim

ENV PYTHONUNBUFFERED True
ENV APP_HOME /app
WORKDIR $APP_HOME

# Install system dependencies required for image processing
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy local code to the container image.
COPY requirements.txt .

# Install production dependencies.
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY app/ app/

# Make sure we use a non-root user
RUN useradd -m appuser
RUN mkdir -p /app/data /app/uploads && chown -R appuser:appuser /app
USER appuser

# Free stack: plain uvicorn behind any reverse proxy (Caddy/Nginx/Traefik).
# Respect $PORT — Cloud Run, App Engine, Fly.io etc. inject it — default 8008.
EXPOSE 8008
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port \"${PORT:-8008}\""]
