# Container publishing

Pushes to `main` automatically build and publish a multi-architecture image to GitHub Container Registry through `.github/workflows/docker.yml`.

Latest image:

```bash
docker pull ghcr.io/jesseyu1984918/valleyball-trainer:latest
```

Run locally:

```bash
docker run --rm -p 8080:8080 ghcr.io/jesseyu1984918/valleyball-trainer:latest
```

The workflow also publishes a commit-SHA tag for each build.
