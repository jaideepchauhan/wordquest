import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { UI_AUDIO_PHRASES } from "../src/data/audioPhrases";
import { WORD_LISTS, type WordItem } from "../src/data/words";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..");
const force = process.argv.includes("--force");

const loadEnvFile = (filePath: string) => {
  if (!existsSync(filePath)) return;

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = line.slice(0, equalsIndex).trim();
    const value = line.slice(equalsIndex + 1).trim().replace(/^['\"]|['\"]$/g, "");

    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
};

loadEnvFile(resolve(repoRoot, ".env.local"));

const apiKey = process.env.ELEVENLABS_API_KEY;
const voiceId = process.env.ELEVENLABS_ENGLISH_VOICE_ID;
const modelId = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
const outputFormat = process.env.ELEVENLABS_OUTPUT_FORMAT || "mp3_44100_128";
const stability = Number(process.env.ELEVENLABS_STABILITY || "0.55");
const similarityBoost = Number(process.env.ELEVENLABS_SIMILARITY_BOOST || "0.8");
const style = Number(process.env.ELEVENLABS_STYLE || "0.2");
const useSpeakerBoost = (process.env.ELEVENLABS_USE_SPEAKER_BOOST || "true") !== "false";

if (!apiKey) {
  throw new Error("Missing ELEVENLABS_API_KEY in .env.local or process environment.");
}

if (!voiceId) {
  throw new Error("Missing ELEVENLABS_ENGLISH_VOICE_ID in .env.local or process environment.");
}

const ensureDir = (dirPath: string) => {
  mkdirSync(dirPath, { recursive: true });
};

const outputRoot = resolve(repoRoot, "public", "audio");
const wordsDir = resolve(outputRoot, "words");
const uiDir = resolve(outputRoot, "ui");
ensureDir(wordsDir);
ensureDir(uiDir);

const getWordFilePath = (word: WordItem) => resolve(wordsDir, `${word.audioKey}.mp3`);
const getPhraseFilePath = (phraseId: string) => resolve(uiDir, `${phraseId}.mp3`);

const synthesize = async (text: string) => {
  const url = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`);
  url.searchParams.set("output_format", outputFormat);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
        style,
        use_speaker_boost: useSpeakerBoost,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs request failed (${response.status}): ${errorText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) {
    throw new Error(`Received empty audio for text: ${text}`);
  }

  return buffer;
};

const delay = (ms: number) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));

const words = Object.values(WORD_LISTS).flat();
const jobs = [
  ...words.map((word) => ({
    kind: "word" as const,
    id: word.audioKey,
    text: word.word,
    filePath: getWordFilePath(word),
  })),
  ...UI_AUDIO_PHRASES.map((phrase) => ({
    kind: "ui" as const,
    id: phrase.id,
    text: phrase.text,
    filePath: getPhraseFilePath(phrase.id),
  })),
];

const created: string[] = [];
const skipped: string[] = [];

for (let index = 0; index < jobs.length; index += 1) {
  const job = jobs[index];
  const relativePath = job.filePath.replace(`${repoRoot}/`, "");

  if (!force && existsSync(job.filePath)) {
    skipped.push(relativePath);
    console.log(`[${index + 1}/${jobs.length}] skip ${relativePath}`);
    continue;
  }

  console.log(`[${index + 1}/${jobs.length}] generate ${relativePath} <- ${job.text}`);
  const audioBuffer = await synthesize(job.text);
  writeFileSync(job.filePath, audioBuffer);
  created.push(relativePath);
  await delay(250);
}

const manifest = {
  generatedAt: new Date().toISOString(),
  voiceId,
  modelId,
  outputFormat,
  words: words.map((word) => ({
    audioKey: word.audioKey,
    word: word.word,
    category: word.category,
    path: `audio/words/${word.audioKey}.mp3`,
  })),
  ui: UI_AUDIO_PHRASES.map((phrase) => ({
    id: phrase.id,
    text: phrase.text,
    path: `audio/ui/${phrase.id}.mp3`,
  })),
};

writeFileSync(resolve(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`\nFinished. Created ${created.length} files, skipped ${skipped.length} existing files.`);
console.log(`Manifest written to public/audio/manifest.json`);
