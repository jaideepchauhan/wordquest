# Hanudhwaj's Word Quest

Word Quest is a React + Vite spelling practice app for Grade 3 preparation. Definitions and example sentences live inside the project, and voice playback can be pre-generated into static audio files, so the live site does not need Gemini, ElevenLabs, or any backend API to run.

The app does include one lightweight PHP endpoint for score logging in production. Each completed game is appended to a JSON file outside the public web root so score history survives redeploys.

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

### Optional one-time voice generation

If you want consistent spoken prompts on every device, create a local `.env.local` from `.env.example` and run:

```bash
npm run generate:audio
```

This generates static MP3 files into `public/audio/` for all current words plus the reusable UI phrases. These files can be committed and deployed like any other asset, and the live site will not call ElevenLabs afterward.

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

## Deploy to `hanu.cleverapp.in`

Assumption:
- Ubuntu or Debian server
- Nginx installed
- DNS for `hanu.cleverapp.in` already points to your server IP

### 1. Build locally

```bash
npm ci
npm run build
```

### 2. Copy the built files to the server

```bash
rsync -avz --delete dist/ user@your-server:/var/www/hanu.cleverapp.in/current/
```

If the target folder does not exist yet, create it on the server first:

```bash
sudo mkdir -p /var/www/hanu.cleverapp.in/current
sudo chown -R $USER:$USER /var/www/hanu.cleverapp.in
```

### 3. Install the Nginx site config on the server

Copy the provided config:

```bash
sudo cp deploy/nginx-word-quest.conf /etc/nginx/sites-available/hanu.cleverapp.in
sudo ln -s /etc/nginx/sites-available/hanu.cleverapp.in /etc/nginx/sites-enabled/hanu.cleverapp.in
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Enable HTTPS

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d hanu.cleverapp.in
```

After Certbot finishes, your site should be live at:

- `http://hanu.cleverapp.in/`
- `https://hanu.cleverapp.in/`

### 5. Updating the site later

Each time you make changes:

```bash
npm run build
rsync -avz --delete dist/ user@your-server:/var/www/hanu.cleverapp.in/current/
```

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

- No API key is required for the live site.
- No Node backend server is required.
- If your hosting supports PHP, completed game scores are written by `public/api/save-score.php`.
- Score logs are stored outside the deployed web root in a sibling `word-quest-data/scores.json` file.
- ElevenLabs access is only needed locally if you choose to generate the optional static voice pack.
- Since the app uses client-side routing behavior, the web server should fall back to `index.html` for unknown paths.
