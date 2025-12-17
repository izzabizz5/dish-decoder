# Quick Start Guide

## Using Pre-built Docker Image (Easiest)

If you just want to run the app without building from source:

1. **Get your Gemini API key** from [Google AI Studio](https://makersuite.google.com/app/apikey)

2. **Pull and run the image:**

```bash
docker run -d \
  -p 3000:3000 \
  -e GEMINI_API_KEY=your_api_key_here \
  --name dish-decoder \
  ghcr.io/OWNER/dish-decoder:latest
```

Replace `OWNER` with the GitHub username/organization.

3. **Open your browser** to `http://localhost:3000`

## Using Docker Compose (Recommended for Production)

1. **Create a `.env` file:**

```bash
echo "GEMINI_API_KEY=your_api_key_here" > .env
```

2. **Download the production docker-compose file:**

```bash
curl -O https://raw.githubusercontent.com/OWNER/dish-decoder/main/docker-compose.prod.yml
```

3. **Edit the image name** in `docker-compose.prod.yml` (replace `OWNER`)

4. **Start the application:**

```bash
docker-compose -f docker-compose.prod.yml up -d
```

5. **View logs:**

```bash
docker-compose -f docker-compose.prod.yml logs -f
```

## Building from Source

If you want to build and run locally:

1. **Clone the repository:**

```bash
git clone https://github.com/OWNER/dish-decoder.git
cd dish-decoder
```

2. **Create `.env` file:**

```bash
echo "GEMINI_API_KEY=your_api_key_here" > .env
```

3. **Build and run:**

```bash
docker-compose up --build -d
```

## Development

To run in development mode:

1. **Install dependencies:**

```bash
npm install
```

2. **Create `.env` file:**

```bash
echo "GEMINI_API_KEY=your_api_key_here" > .env
```

3. **Start dev server:**

```bash
npm run dev
```

4. **Open browser** to `http://localhost:3000`

## Troubleshooting

**API errors:**
- Verify your `GEMINI_API_KEY` is correct
- Check Docker logs: `docker logs dish-decoder` or `docker-compose logs`

**Port 3000 already in use:**
- Use a different port: `-p 8080:3000` (maps to host port 8080)

**Cannot pull image:**
- Make sure the package is public on GitHub
- Or authenticate: `echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin`

## More Information

- [Deployment Guide](./DEPLOYMENT.md) - Detailed deployment instructions
- [Docker Publishing](./.github/DOCKER_PUBLISHING.md) - CI/CD pipeline details

