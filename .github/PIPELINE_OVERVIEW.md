# CI/CD Pipeline Overview

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          GitHub Repository                       │
│                         (Your Code + Config)                     │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │  git push / git tag
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       GitHub Actions Workflow                    │
│                  (.github/workflows/docker-publish.yml)          │
│                                                                   │
│  Steps:                                                           │
│  1. Checkout code                                                │
│  2. Set up Docker Buildx (multi-platform)                        │
│  3. Login to ghcr.io (GitHub Container Registry)                 │
│  4. Extract metadata & generate tags                             │
│  5. Build Docker image (AMD64 + ARM64)                           │
│  6. Push to ghcr.io                                              │
│  7. Output summary                                               │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │  docker push
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              GitHub Container Registry (ghcr.io)                 │
│                                                                   │
│  Images:                                                          │
│  ├─ ghcr.io/OWNER/dish-decoder:latest                           │
│  ├─ ghcr.io/OWNER/dish-decoder:main                             │
│  ├─ ghcr.io/OWNER/dish-decoder:v1.0.0                           │
│  ├─ ghcr.io/OWNER/dish-decoder:v1.0                             │
│  └─ ghcr.io/OWNER/dish-decoder:v1                               │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │  docker pull
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Deployment Targets                          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Local Dev  │  │  Production  │  │  Cloud (AWS, │          │
│  │   Machine    │  │    Server    │  │  DO, Azure)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  All run:                                                         │
│  docker run -p 3000:3000 \                                       │
│    -e GEMINI_API_KEY=xxx \                                       │
│    ghcr.io/OWNER/dish-decoder:latest                            │
└─────────────────────────────────────────────────────────────────┘
```

## Trigger Flow

```
Developer Action         →  GitHub Action         →  Result
────────────────────────────────────────────────────────────────
git push origin main     →  Build + Push          →  :latest, :main
git tag v1.0.0 && push   →  Build + Push          →  :v1.0.0, :v1.0, :v1, :latest
Create Pull Request      →  Build (no push)       →  Test only
```

## Docker Image Layers

```
┌──────────────────────────────────────────┐
│         node:23-alpine (base)            │
├──────────────────────────────────────────┤
│     Package dependencies (npm ci)        │
├──────────────────────────────────────────┤
│     Built Nuxt app (.output/)            │
├──────────────────────────────────────────┤
│     Node server (SSR mode)               │
├──────────────────────────────────────────┤
│     Exposed port 3000                    │
├──────────────────────────────────────────┤
│     CMD: node .output/server/index.mjs   │
└──────────────────────────────────────────┘
```

## Build Process

```
┌─────────────┐
│   Stage 1   │  Builder Stage (node:23-alpine)
│   Builder   │  - Install all dependencies
│             │  - Build Nuxt app (npm run build)
│             │  - Creates .output/ directory
└──────┬──────┘
       │
       │  Copy .output/
       │
       ▼
┌─────────────┐
│   Stage 2   │  Production Stage (node:23-alpine)
│ Production  │  - Install production deps only
│             │  - Copy built .output/
│             │  - Run Node.js server
└─────────────┘
```

## File Structure

```
dish-decoder/
├─ .github/
│  ├─ workflows/
│  │  └─ docker-publish.yml         ← CI/CD workflow
│  ├─ DOCKER_PUBLISHING.md          ← CI/CD docs
│  └─ SETUP_SUMMARY.md              ← This file
├─ .docker/
│  ├─ Dockerfile                    ← Multi-stage build
│  ├─ nginx.conf                    ← (no longer used)
│  ├─ env.js.template               ← (no longer used)
│  └─ docker-entrypoint.sh          ← (no longer used)
├─ server/
│  └─ api/
│     └─ scrape.post.ts             ← API endpoint (SSR)
├─ docker-compose.yml               ← Local dev (builds from source)
├─ docker-compose.prod.yml          ← Production (uses pre-built image)
├─ DEPLOYMENT.md                    ← Full deployment guide
├─ QUICKSTART.md                    ← Quick start guide
└─ nuxt.config.ts                   ← Nuxt config (SSR mode)
```

## Environment Variables

```
┌─────────────────────────────────────────────────────────┐
│ Variable          │ Required │ Where Set               │
├───────────────────┼──────────┼─────────────────────────┤
│ GEMINI_API_KEY    │ YES      │ Runtime (.env / -e)     │
│ NUXT_HOST         │ NO       │ Defaults to 0.0.0.0     │
│ NUXT_PORT         │ NO       │ Defaults to 3000        │
│ NODE_ENV          │ NO       │ Defaults to production  │
│ GITHUB_TOKEN      │ AUTO     │ GitHub Actions provides │
└─────────────────────────────────────────────────────────┘
```

## Deployment Options

### Option 1: Docker Compose (Recommended)
```bash
# Using pre-built image
docker-compose -f docker-compose.prod.yml up -d

# Building from source
docker-compose up --build -d
```

### Option 2: Docker Run
```bash
docker run -d -p 3000:3000 \
  -e GEMINI_API_KEY=xxx \
  ghcr.io/OWNER/dish-decoder:latest
```

### Option 3: Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dish-decoder
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: dish-decoder
        image: ghcr.io/OWNER/dish-decoder:v1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: GEMINI_API_KEY
          valueFrom:
            secretKeyRef:
              name: dish-decoder-secrets
              key: gemini-api-key
```

## Benefits of This Setup

✅ **Automated builds** - Push code, get Docker image
✅ **Multi-platform** - Works on Intel and ARM (M1/M2 Macs, ARM servers)
✅ **Fast builds** - Layer caching via GitHub Actions
✅ **Version control** - Semantic versioning with git tags
✅ **SSR support** - Server-side API routes work
✅ **Production ready** - Optimized multi-stage build
✅ **Easy deployment** - Pull and run anywhere
✅ **No external dependencies** - Uses GitHub's infrastructure

## What Changed from Static (nginx) to SSR (Node.js)

| Aspect | Before (nginx) | After (Node.js) |
|--------|----------------|-----------------|
| Build command | `npm run generate` | `npm run build` |
| Base image | `nginx:alpine` | `node:23-alpine` |
| Port | 80 | 3000 |
| API routes | ❌ Won't work | ✅ Works |
| Static files | ✅ Served by nginx | ✅ Served by Nuxt |
| SSR | ❌ No | ✅ Yes |
| Runtime | nginx (static server) | Node.js (app server) |

## Monitoring & Troubleshooting

### Check workflow status
```bash
# View on GitHub
https://github.com/OWNER/dish-decoder/actions

# Or via CLI (with gh tool)
gh workflow list
gh run list --workflow=docker-publish.yml
```

### Check package on GitHub
```bash
https://github.com/OWNER?tab=packages
```

### View logs
```bash
# Docker
docker logs dish-decoder

# Docker Compose
docker-compose logs -f

# Check if app is responding
curl http://localhost:3000
```

### Test API endpoint
```bash
curl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/recipe"}'
```

## Cost & Resources

- **GitHub Actions**: Free for public repos (2,000 minutes/month)
- **GitHub Container Registry**: Free for public images (unlimited)
- **Build time**: 
  - First build: ~5-10 minutes
  - Cached builds: ~1-3 minutes
- **Image size**: ~200-300 MB (Node.js + dependencies)
- **Runtime memory**: 256-512 MB recommended

## Next Steps

1. ✅ Commit and push to GitHub
2. ✅ Wait for workflow to complete
3. ✅ Make package public (if desired)
4. ✅ Test pulling the image
5. ✅ Deploy to your environment
6. ✅ Create your first version tag (v1.0.0)
7. ✅ Set up production deployment
8. ✅ Configure monitoring/logging

Congratulations! Your CI/CD pipeline is ready! 🎉

