# Multi-hazard Disaster Risk Engine - Google Cloud Run Container
FROM python:3.12-slim

# Prevent python from writing pyc files and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080 \
    HOST=0.0.0.0

WORKDIR /app

# Install dependencies in a single cached layer
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code (all modules, routes, and static assets)
COPY . .

# Create a non-privileged user for security on Cloud Run
RUN useradd -u 1001 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8080

# Cloud Run injects $PORT at runtime; uvicorn binds to $PORT
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 2
