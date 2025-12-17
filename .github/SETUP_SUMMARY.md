# GitHub Actions CI/CD Setup Summary

## ✅ What Was Created

### 1. GitHub Actions Workflow
**File:** `.github/workflows/docker-publish.yml`

This workflow automatically:
- Builds Docker images on every push to `main`/`master`
- Publishes to GitHub Container Registry (ghcr.io)
- Creates version tags when you push git tags (e.g., `v1.0.0`)
- Builds for both AMD64 and ARM64 platforms
- Uses layer caching for fast builds

### 2. Docker Configurations

**Development:** `docker-compose.yml`
- Builds from source locally
- Use for development and testing

**Production:** `docker-compose.prod.yml`  
- Uses pre-built image from GitHub Container Registry
- Use for production deployments
- Includes health checks and resource limits

### 3. Documentation

**QUICKSTART.md** - Get started quickly with pre-built images

**DEPLOYMENT.md** - Complete deployment guide with all options

**.github/DOCKER_PUBLISHING.md** - CI/CD pipeline documentation

## 🚀 How to Use

### First Time Setup

1. **Push your code to GitHub:**

```bash
git add .
git commit -m "Add CI/CD pipeline"
git push origin main
```

2. **Wait for the workflow to complete:**
   - Go to **Actions** tab on GitHub
   - Watch the "Build and Push Docker Image" workflow
   - It will build and publish to ghcr.io/OWNER/dish-decoder:latest

3. **Make the package public (optional):**
   - Go to your repository's **Packages** section
   - Click on `dish-decoder` package
   - **Package settings** → **Change visibility** → **Public**

### Deploying Updates

**Regular updates (main branch):**
```bash
git add .
git commit -m "Update feature"
git push origin main
```
→ Creates new `latest` tag

**Version releases:**
```bash
git tag v1.0.0
git push origin v1.0.0
```
→ Creates `v1.0.0`, `v1.0`, `v1`, and `latest` tags

### Using the Published Image

**Quick run:**
```bash
docker run -d -p 3000:3000 \
  -e GEMINI_API_KEY=your_key \
  ghcr.io/OWNER/dish-decoder:latest
```

**With docker-compose:**
```bash
# Edit docker-compose.prod.yml to set your GitHub username
docker-compose -f docker-compose.prod.yml up -d
```

## 📊 Workflow Features

| Feature | Description |
|---------|-------------|
| **Multi-platform** | Builds for AMD64 and ARM64 |
| **Smart caching** | Fast builds using GitHub Actions cache |
| **Auto-tagging** | Tags based on branch/tag/PR |
| **PR testing** | Builds on PRs without publishing |
| **Build summaries** | Detailed output in workflow logs |

## 🔧 Repository Settings

For the workflow to work, ensure:

1. **Actions enabled:**
   - Settings → Actions → General → "Allow all actions"

2. **Workflow permissions:**
   - Settings → Actions → General → Workflow permissions
   - Select "Read and write permissions"
   - Check "Allow GitHub Actions to create and approve pull requests"

3. **Packages:**
   - Packages are automatically created on first build
   - Set visibility to Public if you want anyone to pull

## 🏷️ Tag Strategy

| Git Action | Docker Tags Created |
|------------|---------------------|
| Push to main | `latest`, `main`, `main-abc1234` |
| Tag v1.2.3 | `1.2.3`, `1.2`, `1`, `latest` |
| Pull request #42 | `pr-42` (build only, not pushed) |

## 🔒 Private vs Public Packages

**Public packages:**
- Anyone can pull without authentication
- Recommended for open-source projects

**Private packages:**
- Require authentication to pull
- Use for proprietary applications
- Authenticate with: `docker login ghcr.io`

## 📝 Next Steps

1. ✅ Push to GitHub (triggers first build)
2. ✅ Make package public (if desired)
3. ✅ Test pulling the image
4. ✅ Deploy to your production environment
5. ✅ Create version tags for releases

## 🐛 Troubleshooting

**Workflow fails:**
- Check Settings → Actions → Workflow permissions
- Ensure "Read and write permissions" is enabled

**Cannot pull image:**
- Public: Just use `docker pull ghcr.io/OWNER/dish-decoder:latest`
- Private: Authenticate first with `docker login ghcr.io`

**Build is slow:**
- First build: ~5-10 minutes (building from scratch)
- Subsequent builds: ~1-3 minutes (using cache)

**Wrong image name:**
- Update the `OWNER` in commands to match your GitHub username
- Check package name at: `https://github.com/OWNER?tab=packages`

## 📚 Resources

- [GitHub Container Registry Docs](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

