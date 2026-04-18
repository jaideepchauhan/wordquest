# Hanudhwaj's Word Quest

Word Quest is a React + Vite spelling practice app for Grade 3 preparation. Definitions and example sentences now live inside the project, so the app does not need Gemini or any backend API to run.

## Stack

- React 19
- Vite 6
- Tailwind CSS 4

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the app:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:5173`.

## Build

Create the production files:

```bash
npm run build
```

Preview the built site locally:

```bash
npm start
```

The production build is written to `dist/`.

## Self-hosted deployment

Because the app is fully static now, the easiest production setup is:

1. Build the app:
   ```bash
   npm ci
   npm run build
   ```
2. Copy the contents of `dist/` to your server web root.
3. Serve it with Nginx or Apache.

### Nginx example

Use the sample config in [deploy/nginx-word-quest.conf](/Users/jd/Sites/hanudhwaj-word-quest/deploy/nginx-word-quest.conf) and point `root` to your deployed `dist/` directory.

### Docker example

Build the image:

```bash
docker build -t word-quest .
```

Run it:

```bash
docker run -d --name word-quest -p 8080:80 word-quest
```

## Notes

- No API key is required.
- No backend server is required.
- Since the app uses client-side routing behavior, the web server should fall back to `index.html` for unknown paths.
