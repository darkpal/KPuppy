# KPuppy

![CI](https://github.com/twttr/KPuppy/actions/workflows/ci.yml/badge.svg?branch=develop)
![License](https://img.shields.io/github/license/twttr/KPuppy)

A lightweight webOS LG TV app for KinoPub online cinema.

## Features

- Netflix-style dark UI optimized for TV remote navigation
- Device code authentication
- Browse movies, series, concerts, documentaries, TV shows
- Continue watching
- Search
- Multi-language support (English, Russian, German)
- Quality selection (4K, 1080p, 720p, 480p)

## Screenshots

<img src=".github/screenshots/screen1.png" alt="Main Screen" width="400"> <img src=".github/screenshots/screen2.png" alt="Movie Details" width="400">
<img src=".github/screenshots/screen3.png" alt="Search" width="400"> <img src=".github/screenshots/screen4.png" alt="Video Player" width="400">

## Requirements

- Node.js 18+
- webOS TV SDK (ares-cli)

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Deployment

```bash
# Package and deploy to TV
npm run package
npm run deploy

# Launch on TV
ares-launch com.kpuppy.app
```

## Tech Stack

- Preact
- TypeScript
- Vite
- Vitest

## License

MIT
