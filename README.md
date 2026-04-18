# Hanudhwaj's Word Quest

Word Quest is a React + Vite spelling practice app for Grade 3 preparation. It now includes a small Node/Express server so the Gemini API key stays on the server instead of being exposed in the browser bundle.

## Stack

- React 19
- Vite 6
- Tailwind CSS 4
- Express 4
- Gemini via `@google/genai`

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create your environment file:
   ```bash
   cp .env.example .env
   ```
3. Add your real `GEMINI_API_KEY` to `.env`.
4. Start the app server:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:3000`.

## Production build

Build the frontend bundle:

```bash
npm run build
```

Run the production server:

```bash
npm start
```

The app server serves the built React app from `dist/` and exposes:

- `GET /api/health`
- `POST /api/word-info`

## Self-hosted server deployment

### Option 1: Node + systemd + Nginx

1. Copy the project to your server.
2. Install Node.js 20 or newer.
3. Install dependencies:
   ```bash
   npm ci
   ```
4. Create `.env` with:
   ```bash
   GEMINI_API_KEY=your_real_key
   PORT=3000
   ```
5. Build the app:
   ```bash
   npm run build
   ```
6. Start it with `npm start`, `pm2`, or `systemd`.
7. Put Nginx in front of it using the sample config in [`deploy/nginx-word-quest.conf`](/Users/jd/Sites/hanudhwaj-word-quest/deploy/nginx-word-quest.conf).

### Option 2: Docker

Build the image:

```bash
docker build -t word-quest .
```

Run it:

```bash
docker run -d \
  --name word-quest \
  -p 3000:3000 \
  --env GEMINI_API_KEY=your_real_key \
  --env PORT=3000 \
  word-quest
```

## Notes from the review

- The original setup injected `GEMINI_API_KEY` into the client build. That is not safe for a live deployment.
- The project did not include a production app server, so a self-hosted deployment would have needed custom handling for the AI feature.
- The browser title and docs still reflected the AI Studio starter template.

## Recommended production checklist

- Keep `GEMINI_API_KEY` only in server-side environment variables.
- Run the app behind HTTPS with Nginx or Caddy.
- Restart the Node process with `systemd` or `pm2`.
- Monitor `GET /api/health` from your server or uptime tool.
