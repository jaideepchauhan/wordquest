/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Volume2, 
  Trophy, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Star, 
  Medal, 
  ChevronRight,
  BookOpen,
  History,
  PartyPopper,
  Settings,
  X,
  Lightbulb
} from "lucide-react";
import { WORD_LISTS, WordItem, ALL_CATEGORIES } from "./data/words";
import { UI_AUDIO_PHRASES, type UiAudioPhraseId } from "./data/audioPhrases";
import { cn } from "./lib/utils";

type GameState = "START" | "CATEGORY_SELECT" | "MODE_SELECT" | "STUDY" | "QUIZ" | "RESULTS";

interface ScoreEntry {
  name: string;
  category: string;
  score: number;
  total: number;
  mistakes: number;
  date: number;
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>("START");
  const [playerName, setPlayerName] = useState(() => {
    if (typeof window === "undefined") return "Hanudhwaj";
    return localStorage.getItem("wordquest_player_name") || "Hanudhwaj";
  });
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [practiceWords, setPracticeWords] = useState<WordItem[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [submittedAttempt, setSubmittedAttempt] = useState("");
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [wrongWords, setWrongWords] = useState<WordItem[]>([]);
  const [isRevealed, setIsRevealed] = useState(false);
  const [definition, setDefinition] = useState<string | null>(null);
  const [example, setExample] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackTokenRef = useRef(0);

  const currentWords =
    selectedCategory === "Practice"
      ? practiceWords
      : selectedCategory
        ? WORD_LISTS[selectedCategory] || []
        : [];
  const activeWord = currentWords[currentWordIndex];
  const displayPlayerName = playerName.trim() || "Player";

  // Load leaderboard
  useEffect(() => {
    const saved = localStorage.getItem("wordquest_leaderboard");
    if (saved) setLeaderboard(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("wordquest_player_name", playerName);
  }, [playerName]);

  const clearWordInfo = useCallback(() => {
    setDefinition(null);
    setExample(null);
  }, []);

  const setWordInfo = useCallback((word: WordItem) => {
    setDefinition(word.definition);
    setExample(word.example);
  }, []);

  const persistScoreToServer = useCallback(async (entry: ScoreEntry) => {
    try {
      const response = await fetch("/api/save-score.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(entry),
        keepalive: true,
      });

      if (!response.ok) {
        throw new Error(`Score save failed with status ${response.status}`);
      }
    } catch (error) {
      console.error("Score save failed", error);
    }
  }, []);

  const saveScore = useCallback((score: number, total: number, mistakes: number) => {
    const newEntry: ScoreEntry = {
      name: displayPlayerName,
      category: selectedCategory,
      score,
      total,
      mistakes,
      date: Date.now(),
    };
    const updated = [...leaderboard, newEntry].sort((a, b) => b.score - a.score).slice(0, 10);
    setLeaderboard(updated);
    localStorage.setItem("wordquest_leaderboard", JSON.stringify(updated));
    void persistScoreToServer(newEntry);
  }, [displayPlayerName, leaderboard, persistScoreToServer, selectedCategory]);

  const browserSpeak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-GB";
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stopAudio = useCallback(() => {
    playbackTokenRef.current += 1;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  }, []);

  const playAudioSequence = useCallback(async (segments: Array<{ src: string; fallbackText: string }>) => {
    if (segments.length === 0) return;

    stopAudio();
    const token = playbackTokenRef.current;

    for (const segment of segments) {
      if (playbackTokenRef.current !== token) return;

      const audio = new Audio(segment.src);
      audio.preload = "auto";
      audioRef.current = audio;

      try {
        await audio.play();
      } catch (error) {
        console.error(`Audio playback failed for ${segment.src}`, error);
        audioRef.current = null;
        browserSpeak(segments.map((item) => item.fallbackText).join(" "));
        return;
      }

      await new Promise<void>((resolve) => {
        const finish = () => {
          audio.removeEventListener("ended", finish);
          audio.removeEventListener("error", finish);
          resolve();
        };

        audio.addEventListener("ended", finish, { once: true });
        audio.addEventListener("error", finish, { once: true });
      });
    }

    if (playbackTokenRef.current === token) {
      audioRef.current = null;
    }
  }, [browserSpeak, stopAudio]);

  const playPhrase = useCallback((phraseId: UiAudioPhraseId) => {
    const phrase = UI_AUDIO_PHRASES.find((entry) => entry.id === phraseId);
    if (!phrase) return;

    void playAudioSequence([{ src: `/audio/ui/${phraseId}.mp3`, fallbackText: phrase.text }]);
  }, [playAudioSequence]);

  const playWord = useCallback((word: WordItem) => {
    void playAudioSequence([{ src: `/audio/words/${word.audioKey}.mp3`, fallbackText: word.word }]);
  }, [playAudioSequence]);

  // Auto-play sound when activeWord changes
  useEffect(() => {
    const shouldAutoPlay =
      activeWord &&
      ((gameState === "QUIZ" && !isRevealed) || gameState === "STUDY");

    if (shouldAutoPlay) {
      const timer = setTimeout(() => {
        playWord(activeWord);
      }, 500); // Small delay for visual transition
      return () => clearTimeout(timer);
    }
  }, [activeWord, gameState, isRevealed, playWord]);

  useEffect(() => () => {
    stopAudio();
  }, [stopAudio]);

  const startStudy = (category: string) => {
    setSelectedCategory(category);
    setCurrentWordIndex(0);
    setGameState("STUDY");
    setSubmittedAttempt("");
    setIsRevealed(false);
    clearWordInfo();
  };

  const startPracticeWrong = () => {
    if (wrongWords.length === 0) return;
    const practiceList = [...wrongWords];
    setPracticeWords(practiceList);
    setSelectedCategory("Practice");
    setCurrentWordIndex(0);
    setScore(0);
    setMistakes(0);
    setWrongWords([]);
    setGameState("QUIZ");
    setUserInput("");
    setSubmittedAttempt("");
    setIsCorrect(null);
    setIsRevealed(false);
    clearWordInfo();
  };

  const fetchWordInfo = (word: WordItem) => {
    setWordInfo(word);
  };

  const getFeedback = (score: number, total: number) => {
    const percent = total > 0 ? (score / total) * 100 : 0;
    if (percent === 100) return { text: "Mastermind!", sub: "Perfect Score! You're a word wizard!", color: "text-amber-500", border: "border-amber-400" };
    if (percent >= 80) return { text: "Amazing Job!", sub: "You're doing fantastic, Hanudhwaj!", color: "text-green-500", border: "border-green-400" };
    if (percent >= 50) return { text: "Great Effort!", sub: "Good work! Keep practicing to get Gold!", color: "text-blue-500", border: "border-blue-400" };
    return { text: "Keep Trying!", sub: "Practice makes perfect! You can do it!", color: "text-slate-500", border: "border-slate-400" };
  };

  const handleNextWord = (skipped: boolean = false) => {
    if (skipped && !isRevealed) {
       setMistakes(prev => prev + 1);
       setWrongWords(prev => {
        if (prev.find(w => w.word === activeWord.word)) return prev;
        return [...prev, activeWord];
      });
    }

    if (currentWordIndex < currentWords.length - 1) {
      setCurrentWordIndex(prev => prev + 1);
      setUserInput("");
      setSubmittedAttempt("");
      setIsCorrect(null);
      setIsRevealed(false);
      setDefinition(null);
      setExample(null);
    } else {
      // Final results logic
      const finalScore = score;
      // If the last word was skipped just now, we need to account for it
      const finalMistakes = skipped && !isRevealed ? mistakes + 1 : mistakes;
      setGameState("RESULTS");
      saveScore(finalScore, currentWords.length, finalMistakes);
    }
  };

  const handleCheckSpelling = () => {
    if (!userInput.trim()) return;

    const trimmedInput = userInput.trim();
    const normalizedInput = trimmedInput.toLowerCase();
    const normalizedTarget = activeWord.word.toLowerCase();
    setSubmittedAttempt(trimmedInput);

    if (normalizedInput === normalizedTarget) {
      setScore(prev => prev + 1);
      setIsCorrect(true);
      playPhrase("great-job");
      setTimeout(() => handleNextWord(), 1500);
    } else {
      setMistakes(prev => prev + 1);
      setWrongWords(prev => {
        // Only add if not already in wrongWords
        if (prev.find(w => w.word === activeWord.word)) return prev;
        return [...prev, activeWord];
      });
      setIsCorrect(false);
      setIsRevealed(true);
      void playAudioSequence([
        { src: "/audio/ui/incorrect.mp3", fallbackText: "Incorrect!" },
        { src: `/audio/words/${activeWord.audioKey}.mp3`, fallbackText: activeWord.word },
      ]);
      fetchWordInfo(activeWord);
    }
  };

  const startQuiz = (category: string) => {
    setSelectedCategory(category);
    setCurrentWordIndex(0);
    setScore(0);
    setMistakes(0);
    setGameState("QUIZ");
    setUserInput("");
    setSubmittedAttempt("");
    setIsCorrect(null);
    setIsRevealed(false);
    clearWordInfo();
  };

  const getMedal = (mistakesCount: number) => {
    if (mistakesCount === 0) return { type: "Gold", color: "text-amber-400", icon: Trophy };
    if (mistakesCount === 1) return { type: "Silver", color: "text-slate-400", icon: Medal };
    if (mistakesCount === 2) return { type: "Bronze", color: "text-amber-600", icon: Medal };
    return null;
  };

  const moveStudyWord = useCallback((nextIndex: number) => {
    const nextWord = currentWords[nextIndex];
    setCurrentWordIndex(nextIndex);

    if (!nextWord) return;

    if (isRevealed) {
      setWordInfo(nextWord);
    } else {
      clearWordInfo();
    }
  }, [clearWordInfo, currentWords, isRevealed, setWordInfo]);

  // Helper to handle swipe in Study mode
  const handleSwipe = (direction: "left" | "right") => {
    if (direction === "right") {
      // Logic for swiping next
      if (currentWordIndex < currentWords.length - 1) {
        moveStudyWord(currentWordIndex + 1);
      } else {
        setGameState("CATEGORY_SELECT");
      }
    } else {
      // Logic for swiping back
      if (currentWordIndex > 0) {
        moveStudyWord(currentWordIndex - 1);
      }
    }
  };

  const goToPreviousQuizWord = useCallback(() => {
    if (currentWordIndex === 0) return;

    stopAudio();
    setCurrentWordIndex(prev => prev - 1);
    setUserInput("");
    setSubmittedAttempt("");
    setIsCorrect(null);
    setIsRevealed(false);
    clearWordInfo();
  }, [clearWordInfo, currentWordIndex, stopAudio]);

  const dismissCorrectionCard = useCallback(() => {
    if (!(gameState === "QUIZ" && isRevealed)) return;

    stopAudio();
    handleNextWord();
  }, [gameState, handleNextWord, isRevealed, stopAudio]);

  useEffect(() => {
    const handleKeyboardNavigation = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingField =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (gameState === "STUDY") {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          handleSwipe("left");
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          handleSwipe("right");
        }
        return;
      }

      if (gameState === "QUIZ" && isRevealed && event.key === "Escape") {
        event.preventDefault();
        dismissCorrectionCard();
        return;
      }

      if (gameState === "QUIZ" && !isRevealed && !isTypingField && event.key === "ArrowLeft") {
        event.preventDefault();
        goToPreviousQuizWord();
      }
    };

    window.addEventListener("keydown", handleKeyboardNavigation);
    return () => window.removeEventListener("keydown", handleKeyboardNavigation);
  }, [dismissCorrectionCard, gameState, goToPreviousQuizWord, handleSwipe, isRevealed]);

  return (
    <div className="quest-bg min-h-screen text-[#141414] font-sans selection:bg-amber-100 p-4 md:p-8 flex flex-col items-center overflow-x-hidden relative isolate">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ y: [0, -12, 0], rotate: [-8, -2, -8] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="quest-doodle-loop left-[4%] top-18"
        />
        <motion.div
          animate={{ y: [0, 10, 0], x: [0, 8, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="quest-doodle-cloud right-[7%] top-24"
        />
        <motion.div
          animate={{ rotate: [0, 8, -4, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="quest-doodle-squiggle left-[10%] bottom-28"
        />
        <motion.div
          animate={{ scale: [1, 1.08, 1], rotate: [12, 0, 12] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="quest-doodle-ring right-[9%] bottom-20"
        />
        <motion.div
          animate={{ y: [0, -8, 0], rotate: [0, 6, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-[12%] top-[34%] text-amber-300/70"
        >
          <Star className="h-8 w-8 fill-current" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 8, 0], rotate: [-10, 0, -10] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-[16%] top-[48%] text-orange-300/60"
        >
          <Trophy className="h-10 w-10" />
        </motion.div>
      </div>

      <header className="quest-panel w-full max-w-2xl mb-8 flex justify-between items-center p-4 rounded-3xl">
        <div className="flex items-center gap-3">
          <motion.div 
            whileHover={{ rotate: 15 }}
            className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center shadow-lg transform -rotate-6"
          >
            <BookOpen className="text-white w-6 h-6" />
          </motion.div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Word Quest</h1>
            {gameState === "START" ? (
              <p className="text-[10px] font-black uppercase text-orange-500 tracking-[0.25em]">Quest Hub</p>
            ) : (
              <p className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Player: {displayPlayerName}</p>
            )}
            {(gameState === "QUIZ" || gameState === "STUDY") && (
               <p className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Subject: {selectedCategory}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(gameState === "QUIZ" || gameState === "STUDY") && (
            <div className="bg-amber-100 px-4 py-2 rounded-2xl flex items-center gap-2 border border-amber-200">
               <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
               <span className="font-black text-amber-700 text-lg">{score}</span>
            </div>
          )}
          
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
          >
            <Settings className="w-5 h-5" />
          </button>

          {gameState !== "START" && (
            <button 
              onClick={() => {
                setGameState("START");
                setSubmittedAttempt("");
                setIsRevealed(false);
                setDefinition(null);
                setExample(null);
              }}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <RotateCcw className="w-5 h-5 text-slate-500" />
            </button>
          )}
        </div>
      </header>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-8 border border-white"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black flex items-center gap-2">
                  <Settings className="w-5 h-5" /> Settings
                </h3>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="rounded-[28px] border-2 border-amber-100 bg-amber-50/70 p-5">
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-600">Voice Pack Ready</p>
                  <p className="mt-2 text-sm text-slate-500">
                    This build prefers pre-generated voice clips stored with the app. If the pack has not been generated yet, it falls back to the browser voice so gameplay still works.
                  </p>
                </div>
                
                <button 
                  onClick={() => playPhrase("lets-get-that-gold")}
                  className="w-full py-3 bg-amber-50 text-amber-600 font-bold rounded-2xl border-2 border-amber-100 hover:bg-amber-100 transition-colors"
                >
                  Test Voice
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="w-full max-w-md flex-grow flex flex-col items-center justify-center relative z-10">
        <AnimatePresence mode="wait">
          {gameState === "START" && (
            <motion.div 
              key="start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-8 w-full"
            >
              <div className="space-y-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-orange-500 shadow-sm">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  Spelling Arena
                </span>
                <h2 className="text-4xl font-black text-amber-500 italic">Hi {displayPlayerName}!</h2>
                <p className="text-slate-500">Choose your champion name and jump into the next word quest.</p>
              </div>

              <div className="grid grid-cols-1 gap-4 w-full">
                <div className="quest-panel rounded-[34px] p-5 text-left">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-500 shadow-inner">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Champion Name</p>
                      <p className="text-sm text-slate-500">This is saved for the Hall of Fame and score history.</p>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter player name"
                    className="w-full rounded-[26px] border-2 border-orange-100 bg-white px-5 py-4 text-lg font-black text-slate-700 outline-none transition-all focus:border-amber-400 focus:shadow-[0_0_0_5px_rgba(251,191,36,0.15)]"
                  />
                </div>

                <button 
                  onClick={() => setGameState("CATEGORY_SELECT")}
                  className="w-full py-5 bg-amber-400 hover:bg-amber-500 text-white rounded-[32px] font-bold text-xl shadow-[0_10px_0_0_#d97706] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 mb-2"
                >
                  Let's Play! <ChevronRight />
                </button>
                
                {wrongWords.length > 0 && (
                  <button 
                    onClick={startPracticeWrong}
                    className="w-full py-4 bg-red-400 hover:bg-red-500 text-white rounded-[24px] font-bold text-lg shadow-[0_8px_0_0_#b91c1c] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                  >
                    <History className="w-5 h-5" /> Practice Hard Words ({wrongWords.length})
                  </button>
                )}

                {leaderboard.length > 0 && (
                  <div className="quest-panel mt-4 p-6 rounded-[40px]">
                    <h3 className="text-lg font-bold flex items-center justify-center gap-2 mb-4">
                      <Trophy className="w-5 h-5 text-amber-500" /> Hall of Fame
                    </h3>
                    <div className="space-y-3">
                      {leaderboard.map((entry, i) => (
                        <div key={i} className="flex justify-between items-center text-sm p-2 rounded-xl bg-slate-50">
                          <span className="flex items-center gap-2">
                            <span className={cn(
                              "w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-bold",
                              i === 0 ? "bg-amber-400 text-white" : "bg-slate-200 text-slate-500"
                            )}>{i + 1}</span>
                            <span className="font-semibold">{entry.name}</span>
                            <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-slate-200">{entry.category}</span>
                          </span>
                          <span className="font-mono font-bold text-amber-600">{entry.score}/{entry.total}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {gameState === "CATEGORY_SELECT" && (
            <motion.div 
              key="category"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full space-y-6"
            >
              <div className="text-center space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-orange-500">Pick Your Arena</p>
                <h2 className="text-2xl font-bold">Choose a Subject</h2>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {ALL_CATEGORIES.filter(c => c !== "Practice").map(cat => (
                  <div key={cat} className="flex gap-2">
                    <button
                      onClick={() => startQuiz(cat)}
                      className="flex-grow p-6 bg-white border-2 border-slate-100 hover:border-amber-400 rounded-3xl text-left font-bold text-lg transition-all flex justify-between items-center group shadow-sm active:scale-[0.98]"
                    >
                      <div className="flex flex-col">
                        <span>{cat}</span>
                        <span className="text-xs font-normal text-slate-400">Competition</span>
                      </div>
                      <Trophy className="w-5 h-5 text-slate-200 group-hover:text-amber-400 transition-colors" />
                    </button>
                    <button
                      onClick={() => startStudy(cat)}
                      className="p-6 bg-slate-100 border-2 border-transparent hover:border-slate-300 rounded-3xl text-slate-600 transition-all active:scale-[0.98]"
                      title="Study Mode"
                    >
                      <BookOpen className="w-6 h-6" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {gameState === "STUDY" && activeWord && (
            <motion.div key="study" className="w-full flex flex-col items-center gap-6">
              <div className="w-full flex justify-between items-center text-sm font-bold text-slate-400">
                <span>Learning: {selectedCategory}</span>
                <span>{currentWordIndex + 1} / {currentWords.length}</span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeWord.word}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  initial={{ x: 100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -100, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.x > 100) handleSwipe("left"); // Swiping right goes back
                    if (info.offset.x < -100) handleSwipe("right"); // Swiping left goes next
                  }}
                  className="quest-panel w-full aspect-[4/5] rounded-[40px] p-8 flex flex-col items-center justify-center relative transition-all border-b-[12px] border-amber-100 group cursor-grab active:cursor-grabbing"
                >
                <div className="absolute left-6 top-6 rounded-full bg-orange-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-orange-600">
                  Study Deck
                </div>
                <div className="flex-grow flex flex-col items-center justify-center text-center">
                  <h3 className="text-6xl font-black mb-4 group-hover:scale-105 transition-transform">{activeWord.word}</h3>
                  <button 
                    onClick={() => playWord(activeWord)}
                    className="p-4 bg-amber-50 rounded-full hover:bg-amber-100 transition-colors"
                  >
                    <Volume2 className="w-10 h-10 text-amber-500" />
                  </button>
                </div>

                {!isRevealed ? (
                  <button 
                    onClick={() => {
                      setIsRevealed(true);
                      fetchWordInfo(activeWord);
                    }}
                    className="mt-4 text-amber-500 font-bold flex items-center gap-2 hover:underline"
                  >
                    Reveal Definition <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="w-full mt-4 space-y-4">
                    <div className="p-4 bg-slate-50 rounded-2xl text-sm italic text-slate-700">{definition}</div>
                    <div className="p-4 bg-amber-50 rounded-2xl text-sm text-amber-800">"{example}"</div>
                  </div>
                )}
                
                <div className="mt-8 flex gap-4 w-full">
                  <button 
                    onClick={() => handleSwipe("left")} 
                    className="flex-1 py-3 bg-slate-100 rounded-2xl font-bold text-slate-500 flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" /> Back
                  </button>
                  <button 
                    onClick={() => handleSwipe("right")} 
                    className="flex-1 py-3 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Side Arrows for Quick Navigation */}
                <div className="absolute top-1/2 -left-4 -translate-y-1/2 hidden md:block">
                   <button 
                    onClick={() => handleSwipe("left")}
                    disabled={currentWordIndex === 0}
                    className="w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center text-slate-400 hover:text-amber-500 disabled:opacity-0 transition-all border border-slate-100"
                   >
                     <ChevronRight className="w-6 h-6 rotate-180" />
                   </button>
                </div>
                <div className="absolute top-1/2 -right-4 -translate-y-1/2 hidden md:block">
                   <button 
                    onClick={() => handleSwipe("right")}
                    className="w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center text-slate-400 hover:text-amber-500 transition-all border border-slate-100"
                   >
                     <ChevronRight className="w-6 h-6 " />
                   </button>
                </div>
              </motion.div>
              </AnimatePresence>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Swipe left or right to move</p>
            </motion.div>
          )}

          {gameState === "QUIZ" && activeWord && (
            <motion.div 
              key="quiz"
              layout
              className="w-full flex flex-col items-center gap-6"
            >
              <div className="w-full flex justify-between items-center text-sm font-bold text-slate-400 mb-2">
                <span className="bg-slate-100 px-3 py-1 rounded-full">{currentWordIndex + 1} / {currentWords.length}</span>
                <span className="flex items-center gap-1 bg-green-50 text-green-600 px-3 py-1 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> {score} Correct
                </span>
              </div>

              <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden mb-4 p-[1px]">
                <motion.div 
                  className="bg-amber-400 h-full rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentWordIndex + 1) / currentWords.length) * 100}%` }}
                />
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeWord.word}
                  initial={{ x: 100, opacity: 0, rotate: 5 }}
                  animate={{ x: 0, opacity: 1, rotate: 0 }}
                  exit={{ x: -100, opacity: 0, rotate: -5 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className={cn(
                    "quest-panel w-full aspect-[4/5] max-h-[420px] rounded-[44px] p-8 flex flex-col items-center justify-center relative overflow-hidden transition-colors border-b-[12px]",
                    isCorrect === true ? "border-green-500" : isCorrect === false ? "border-red-500" : "border-amber-100"
                  )}
                >
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute left-4 top-4 rounded-full bg-amber-100/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-amber-700">
                      Quest Stage {currentWordIndex + 1}
                    </div>
                    <div className="absolute -right-8 top-16 h-28 w-28 rounded-full bg-orange-100/60 blur-2xl" />
                    <div className="absolute -left-8 bottom-10 h-24 w-24 rounded-full bg-amber-100/60 blur-2xl" />
                  </div>
                  {!isRevealed ? (
                    <>
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => playWord(activeWord)}
                        className="w-36 h-36 bg-amber-50 rounded-full flex items-center justify-center mb-8 group hover:bg-amber-100 transition-colors shadow-[inset_0_4px_10px_rgba(251,191,36,0.1)] relative"
                      >
                        <Volume2 className="w-20 h-20 text-amber-500 group-hover:scale-110 transition-transform" />
                        <motion.div 
                          animate={{ scale: [1, 1.2, 1] }} 
                          transition={{ repeat: Infinity, duration: 2 }}
                          className="absolute inset-0 border-4 border-amber-200 rounded-full opacity-50" 
                        />
                      </motion.button>
                      <p className="text-amber-600 font-black text-sm tracking-[0.2em] uppercase mb-8">Listen carefully!</p>

                      <input
                        ref={inputRef}
                        autoFocus
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCheckSpelling()}
                        placeholder="Type it here..."
                        className="w-full bg-slate-50 border-4 border-slate-100 rounded-3xl p-5 text-center text-3xl font-black focus:outline-none focus:border-amber-400 transition-all uppercase placeholder:text-slate-200 shadow-inner"
                      />
                      <p className="mt-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                        Hit check when your spelling is ready
                      </p>
                      
                      <div className="mt-8 flex gap-4 w-full">
                         <button
                           onClick={goToPreviousQuizWord}
                           disabled={currentWordIndex === 0}
                           className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-30"
                         >
                           <ChevronRight className="w-5 h-5 rotate-180" />
                         </button>
                         <button
                           disabled={!userInput.trim()}
                           onClick={handleCheckSpelling}
                           className="flex-[2] py-4 bg-gradient-to-b from-emerald-400 to-emerald-500 text-white rounded-2xl font-black text-lg hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-50 transition-all shadow-[0_5px_0_0_#0f766e] flex items-center justify-center gap-2"
                         >
                           CHECK!
                         </button>
                         <button
                           onClick={() => {
                             setIsRevealed(true);
                             fetchWordInfo(activeWord);
                           }}
                           className="flex-1 py-4 bg-amber-50 text-amber-500 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-amber-100"
                           title="Hint"
                         >
                            <Lightbulb className="w-5 h-5" />
                         </button>
                         <button
                           onClick={() => handleNextWord(true)}
                           className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200"
                           title="Skip word"
                         >
                            <ChevronRight className="w-5 h-5" />
                         </button>
                      </div>
                    </>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full h-full flex flex-col items-center text-center overflow-y-auto"
                    >
                      <div className="mb-6 space-y-1">
                        <div className="bg-red-500 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase inline-block mb-2">Study Correction</div>
                        <h3 className="text-5xl font-black text-slate-900 leading-tight">{activeWord.word}</h3>
                      </div>

                      <div className="space-y-6 flex-grow ">
                        {isCorrect === false && submittedAttempt && (
                          <div className="grid grid-cols-1 gap-3 text-left sm:grid-cols-2">
                            <div className="rounded-[28px] border border-red-100 bg-red-50 p-4">
                              <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-red-400">
                                Your Spelling
                              </span>
                              <p className="mt-2 break-words text-2xl font-black text-red-600">
                                {submittedAttempt}
                              </p>
                            </div>
                            <div className="rounded-[28px] border border-emerald-100 bg-emerald-50 p-4">
                              <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">
                                Correct Spelling
                              </span>
                              <p className="mt-2 break-words text-2xl font-black text-emerald-700">
                                {activeWord.word}
                              </p>
                            </div>
                          </div>
                        )}
                        {definition && (
                          <div className="bg-amber-50 text-amber-900 p-5 rounded-[32px] text-sm italic border border-amber-100">
                            {definition}
                          </div>
                        )}
                        {example && (
                          <div className="text-slate-500 text-sm font-medium leading-relaxed px-4">
                            <span className="block text-[10px] uppercase text-slate-300 font-black mb-1">Example</span>
                            "{example}"
                          </div>
                        )}
                        <button 
                          onClick={handleNextWord}
                          className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-xl flex items-center justify-center gap-2 shadow-[0_6px_0_0_#000] active:translate-y-1 active:shadow-none transition-all"
                        >
                          GOT IT! <ChevronRight />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  <div className="absolute top-8 right-8">
                    {isCorrect === true && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                        <CheckCircle2 className="w-12 h-12 text-green-500" />
                      </motion.div>
                    )}
                    {isCorrect === false && (
                      isRevealed ? (
                        <motion.button
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring" }}
                          onClick={dismissCorrectionCard}
                          className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500 shadow-sm ring-1 ring-red-100 transition hover:bg-red-100"
                          title="Close correction"
                          aria-label="Close correction"
                        >
                          <X className="h-6 w-6" />
                        </motion.button>
                      ) : (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                          <XCircle className="w-12 h-12 text-red-500" />
                        </motion.div>
                      )
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}

          {gameState === "RESULTS" && (
            <motion.div 
              key="results"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full text-center space-y-8"
            >
              {(() => {
                const feedback = getFeedback(score, currentWords.length);
                return (
                  <div className="relative inline-block mb-4">
                    {score / currentWords.length >= 0.8 && (
                       <PartyPopper className="w-20 h-20 text-amber-500 absolute -top-10 -left-10 animate-bounce" />
                    )}
                    <div className={cn("quest-panel px-8 py-5 rounded-[40px] border-4", feedback.border)}>
                      <h2 className={cn("text-3xl font-black italic mb-1", feedback.color)}>{feedback.text}</h2>
                      <p className="text-xs text-slate-500 font-bold">{feedback.sub}</p>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-6 rounded-[32px]">
                  <p className="text-green-600 text-xs font-bold uppercase mb-1">Score</p>
                  <p className="text-4xl font-black text-green-700">{score} / {currentWords.length}</p>
                </div>
                <div className="bg-red-50 p-6 rounded-[32px]">
                  <p className="text-red-600 text-xs font-bold uppercase mb-1">Mistakes</p>
                  <p className="text-4xl font-black text-red-700">{mistakes}</p>
                </div>
              </div>

              {getMedal(mistakes) && (
                <motion.div 
                  initial={{ rotate: -15, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", delay: 0.5 }}
                  className="bg-white p-8 rounded-[40px] shadow-xl border border-slate-100 flex flex-col items-center gap-2"
                >
                  <div className={cn("w-20 h-20 rounded-full flex items-center justify-center bg-slate-50", getMedal(mistakes)?.color)}>
                    {(() => {
                      const MedalIcon = getMedal(mistakes)?.icon || Medal;
                      return <MedalIcon className="w-12 h-12" />;
                    })()}
                  </div>
                  <h3 className={cn("text-2xl font-black uppercase", getMedal(mistakes)?.color)}>
                    {getMedal(mistakes)?.type} Medal
                  </h3>
                </motion.div>
              )}

              {wrongWords.length > 0 && (
                <div className="text-left bg-white p-6 rounded-[32px] shadow-sm">
                  <h4 className="font-bold flex items-center gap-2 mb-4 text-red-500">
                    <History className="w-4 h-4" /> Hard Words to Practice:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {wrongWords.map((w, i) => (
                      <span key={i} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-xl font-bold text-sm">
                        {w.word}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => startQuiz(selectedCategory)}
                  className="w-full py-5 bg-amber-400 text-white rounded-2xl font-bold text-xl shadow-xl hover:bg-amber-500 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-6 h-6" /> Play Again
                </button>
                <button 
                  onClick={() => setGameState("CATEGORY_SELECT")}
                  className="w-full py-4 text-slate-500 font-bold rounded-2xl hover:bg-slate-100 transition-all"
                >
                  Different Subject
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-12 text-[10px] text-slate-400 font-mono tracking-widest uppercase flex items-center gap-4 relative z-10">
        <span>Hanudhwaj's Word Quest</span>
        <span>•</span>
        <span>Grade 3 Competition Prep</span>
      </footer>
    </div>
  );
}
