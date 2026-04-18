export const UI_AUDIO_PHRASES = [
  {
    id: "great-job",
    text: "Great job!",
    description: "Played after a correct answer.",
  },
  {
    id: "incorrect",
    text: "Incorrect!",
    description: "Played before the correct spelling is revealed.",
  },
  {
    id: "lets-get-that-gold",
    text: "Hello Hanudhwaj! Let's get that Gold!",
    description: "Used in settings to test the voice pack.",
  },
] as const;

export type UiAudioPhrase = (typeof UI_AUDIO_PHRASES)[number];
export type UiAudioPhraseId = UiAudioPhrase["id"];
