# Deployment Guide

## Docker Deployment (SSR)

This application uses Server-Side Rendering (SSR) with Node.js to support server-side API routes.

### Prerequisites

- Docker and Docker Compose installed
- A Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

## Quick Start - Using Pre-built Image

Pull the latest image from GitHub Container Registry:

```bash
# Pull the image
docker pull ghcr.io/OWNER/dish-decoder:latest

# Run it
docker run -d \
  -p 3000:3000 \
  -e GEMINI_API_KEY=your_api_key_here \
  --name dish-decoder \
  ghcr.io/OWNER/dish-decoder:latest
```

Replace `OWNER` with your GitHub username or organization name.

### Environment Variables

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_actual_api_key_here
```

### Building and Running

#### Using Docker Compose (Recommended)

```bash
# Build and start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

The application will be available at `http://localhost:3000`

#### Using Docker directly

```bash
# Build the image
docker build -f .docker/Dockerfile -t dish-decoder .

# Run the container
docker run -d \
  -p 3000:3000 \
  -e GEMINI_API_KEY=your_api_key_here \
  --name dish-decoder \
  dish-decoder

# View logs
docker logs -f dish-decoder

# Stop the container
docker stop dish-decoder
docker rm dish-decoder
```

### Port Configuration

The application listens on port 3000 by default. To change this:

```bash
docker run -d \
  -p 8080:3000 \
  -e GEMINI_API_KEY=your_api_key_here \
  dish-decoder
```

This maps port 8080 on your host to port 3000 in the container.

### Production Deployment

For production deployments (e.g., AWS, DigitalOcean, etc.):

1. **Set environment variables** through your hosting platform's interface
2. **Expose port 3000** or configure a reverse proxy (nginx, Caddy, etc.)
3. **Add health checks** by pinging `http://localhost:3000` (the app responds to HTTP requests)

### Docker Compose with Pre-built Image

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  dish-decoder:
    image: ghcr.io/OWNER/dish-decoder:latest
    ports:
      - "3000:3000"
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    restart: unless-stopped
```

Then run:

```bash
docker-compose up -d
```

### GitHub Container Registry Authentication

To pull private images, authenticate with GitHub:

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

### Continuous Deployment

This repository includes a GitHub Action that automatically builds and publishes Docker images to GitHub Container Registry on every push to `main` or when you create a version tag.

**To create a new release:**

```bash
git tag v1.0.0
git push origin v1.0.0
```

This will trigger a build and publish images tagged with:
- `latest`
- `v1.0.0`
- `v1.0`
- `v1`
- `main-<git-sha>`

### Troubleshooting

**API not working:**
- Ensure `GEMINI_API_KEY` is set correctly
- Check logs with `docker-compose logs -f` or `docker logs -f dish-decoder`

**Port conflicts:**
- Change the host port mapping: `3001:3000` instead of `3000:3000`

**Build fails:**
- Clear Docker cache: `docker-compose build --no-cache`

**Cannot pull image:**
- Make sure your GitHub package is public, or authenticate with `docker login ghcr.io`
- Check that the image name matches your GitHub username/organization

