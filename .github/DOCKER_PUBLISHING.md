# GitHub Actions Docker Publishing

This repository uses GitHub Actions to automatically build and publish Docker images to GitHub Container Registry (ghcr.io).

## What It Does

The workflow (`.github/workflows/docker-publish.yml`) automatically:

1. **Builds** a multi-platform Docker image (AMD64 and ARM64)
2. **Pushes** to GitHub Container Registry
3. **Tags** images appropriately based on branch/tag
4. **Caches** layers for faster builds

## Triggers

The workflow runs on:

- **Push to `main`/`master`** - Creates `latest` tag
- **Version tags** (e.g., `v1.0.0`) - Creates version-specific tags
- **Pull Requests** - Builds but doesn't push (for testing)

## Image Tags

### On push to main branch:
- `ghcr.io/OWNER/dish-decoder:latest`
- `ghcr.io/OWNER/dish-decoder:main`
- `ghcr.io/OWNER/dish-decoder:main-<git-sha>`

### On version tag (e.g., `v1.2.3`):
- `ghcr.io/OWNER/dish-decoder:1.2.3`
- `ghcr.io/OWNER/dish-decoder:1.2`
- `ghcr.io/OWNER/dish-decoder:1`
- `ghcr.io/OWNER/dish-decoder:latest`

Replace `OWNER` with your GitHub username or organization.

## Setup

### 1. Enable GitHub Packages

The workflow uses the automatic `GITHUB_TOKEN` - no secrets configuration needed!

### 2. Make Package Public (Optional)

After the first build:

1. Go to your repository's **Packages** section
2. Click on the `dish-decoder` package
3. Click **Package settings**
4. Scroll to **Danger Zone**
5. Click **Change visibility** → **Public**

### 3. Create a Release Tag

To publish a versioned release:

```bash
# Tag the current commit
git tag v1.0.0

# Push the tag to GitHub
git push origin v1.0.0
```

This triggers the workflow and creates version-specific tags.

## Using the Published Image

### Pull and Run

```bash
# Pull the latest image
docker pull ghcr.io/OWNER/dish-decoder:latest

# Run it
docker run -d \
  -p 3000:3000 \
  -e GEMINI_API_KEY=your_api_key \
  ghcr.io/OWNER/dish-decoder:latest
```

### Using in docker-compose.yml

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

## Authentication for Private Packages

If your package is private, authenticate Docker:

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

Or create a Personal Access Token (PAT) with `read:packages` scope:

```bash
echo $PAT | docker login ghcr.io -u USERNAME --password-stdin
```

## Workflow Features

- ✅ **Multi-platform builds** (AMD64 and ARM64)
- ✅ **Layer caching** for faster builds
- ✅ **Automatic tagging** based on git refs
- ✅ **PR builds** without publishing
- ✅ **Build summaries** in workflow logs

## Monitoring Builds

1. Go to your repository on GitHub
2. Click the **Actions** tab
3. View the latest "Build and Push Docker Image" workflow run
4. Check the job summary for published image details

## Troubleshooting

### Workflow fails with permission error

Make sure your repository has the correct permissions:
- Go to **Settings** → **Actions** → **General**
- Under **Workflow permissions**, ensure "Read and write permissions" is selected

### Cannot pull image

- For public packages: Use `docker pull ghcr.io/OWNER/dish-decoder:latest`
- For private packages: Authenticate first with `docker login ghcr.io`

### Build is slow

The workflow uses GitHub Actions cache. First build is slow, subsequent builds are much faster due to layer caching.

