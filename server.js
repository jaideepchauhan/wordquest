import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT || 3000);

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    mode: isProduction ? 'production' : 'development',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

app.post('/api/word-info', async (req, res) => {
  const { word, language } = req.body ?? {};

  if (!word || typeof word !== 'string') {
    return res.status(400).json({ error: 'A valid word is required.' });
  }

  if (!ai) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY is not configured on the server.',
    });
  }

  try {
    const responseLanguage = language === 'hi-IN' ? 'Hindi (Devanagari script)' : 'English';
    const prompt = `Provide a simple definition and one short example sentence for the word "${word}" suitable for an 8-year-old. Format as JSON: { "definition": "...", "example": "..." }. Language of response: ${responseLanguage}.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const data = JSON.parse(response.text || '{}');
    return res.json({
      definition: typeof data.definition === 'string' ? data.definition : null,
      example: typeof data.example === 'string' ? data.example : null,
    });
  } catch (error) {
    console.error('Gemini request failed', error);
    return res.status(502).json({
      error: 'Failed to fetch word information from Gemini.',
    });
  }
});

if (!isProduction) {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true, host: '0.0.0.0', port },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  app.use('*', async (req, res, next) => {
    try {
      const templatePath = path.resolve(__dirname, 'index.html');
      const template = await fs.readFile(templatePath, 'utf8');
      const html = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (error) {
      vite.ssrFixStacktrace(error);
      next(error);
    }
  });
} else {
  const distDir = path.resolve(__dirname, 'dist');
  app.use(express.static(distDir));

  app.use('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Word Quest server listening on http://0.0.0.0:${port}`);
});
