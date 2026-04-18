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
  const [playerName, setPlayerName] = useState("Hanudhwaj");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [wrongWords, setWrongWords] = useState<WordItem[]>([]);
  const [isRevealed, setIsRevealed] = useState(false);
  const [definition, setDefinition] = useState<string | null>(null);
  const [example, setExample] = useState<string | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const currentWords = selectedCategory ? WORD_LISTS[selectedCategory] : [];
  const activeWord = currentWords[currentWordIndex];

  // Load system voices and set default UK voice
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      
      // Preferred: Google UK English, then any UK English, then fallback to first available
      const ukVoice = availableVoices.find(v => v.name.includes("UK") && v.lang.startsWith("en-GB")) || 
                      availableVoices.find(v => v.lang === "en-GB") ||
                      availableVoices.find(v => v.lang.startsWith("en-GB")) ||
                      availableVoices.find(v => v.lang.startsWith("en"));
      
      if (ukVoice && !selectedVoiceURI) {
        setSelectedVoiceURI(ukVoice.voiceURI);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [selectedVoiceURI]);

  // Auto-play sound when activeWord changes
  useEffect(() => {
    if ((gameState === "QUIZ" || gameState === "STUDY") && activeWord && !isRevealed) {
      const timer = setTimeout(() => {
        speak(activeWord.word, activeWord.language);
      }, 500); // Small delay for visual transition
      return () => clearTimeout(timer);
    }
  }, [activeWord, gameState, isRevealed]);

  // Load leaderboard
  useEffect(() => {
    const saved = localStorage.getItem("wordquest_leaderboard");
    if (saved) setLeaderboard(JSON.parse(saved));
  }, []);

  const saveScore = useCallback((score: number, total: number, mistakes: number) => {
    const newEntry: ScoreEntry = {
      name: playerName,
      category: selectedCategory,
      score,
      total,
      mistakes,
      date: Date.now(),
    };
    const updated = [...leaderboard, newEntry].sort((a, b) => b.score - a.score).slice(0, 10);
    setLeaderboard(updated);
    localStorage.setItem("wordquest_leaderboard", JSON.stringify(updated));
  }, [playerName, selectedCategory, leaderboard]);

  const speak = (text: string, lang: string = "en-IN") => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Attempt to use selected voice
    const selectedVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    } else {
      // Fallback: prefer en-GB (UK)
      utterance.lang = "en-GB";
    }
    
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  };

  const startStudy = (category: string) => {
    setSelectedCategory(category);
    setCurrentWordIndex(0);
    setGameState("STUDY");
    setIsRevealed(false);
    setDefinition(null);
    setExample(null);
  };

  const startPracticeWrong = () => {
    if (wrongWords.length === 0) return;
    // Temporarily override WORD_LISTS for this session
    const practiceList = [...wrongWords];
    setSelectedCategory("Practice");
    WORD_LISTS["Practice"] = practiceList; // This is a bit hacky but works for local state
    setCurrentWordIndex(0);
    setScore(0);
    setMistakes(0);
    setWrongWords([]);
    setGameState("QUIZ");
    setUserInput("");
    setIsCorrect(null);
    setIsRevealed(false);
  };

  const fetchWordInfo = async (word: WordItem) => {
    setIsLoadingInfo(true);
    setDefinition(null);
    setExample(null);
    try {
      const response = await fetch("/api/word-info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          word: word.word,
          language: word.language,
        }),
      });

      if (!response.ok) {
        throw new Error(`Word info request failed with status ${response.status}`);
      }

      const data = await response.json();
      setDefinition(data.definition || "Definition is unavailable right now.");
      setExample(data.example || "Example is unavailable right now.");
    } catch (error) {
      console.error("Word info lookup failed", error);
      setDefinition("Definition is unavailable right now.");
      setExample("Example is unavailable right now.");
    } finally {
      setIsLoadingInfo(false);
    }
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

    const normalizedInput = userInput.trim().toLowerCase();
    const normalizedTarget = activeWord.word.toLowerCase();

    if (normalizedInput === normalizedTarget) {
      setScore(prev => prev + 1);
      setIsCorrect(true);
      speak(activeWord.language === "hi-IN" ? "सही जवाब" : "Great job!", activeWord.language);
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
      speak(activeWord.language === "hi-IN" ? "गलत! सही वर्तनी है " + activeWord.word : "Incorrect! The correct spelling is " + activeWord.word, activeWord.language);
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
    setIsCorrect(null);
    setIsRevealed(false);
  };

  const getMedal = (mistakesCount: number) => {
    if (mistakesCount === 0) return { type: "Gold", color: "text-amber-400", icon: Trophy };
    if (mistakesCount === 1) return { type: "Silver", color: "text-slate-400", icon: Medal };
    if (mistakesCount === 2) return { type: "Bronze", color: "text-amber-600", icon: Medal };
    return null;
  };

  // Helper to handle swipe in Study mode
  const handleSwipe = (direction: "left" | "right") => {
    if (direction === "right") {
      // Logic for swiping next
      if (currentWordIndex < currentWords.length - 1) {
        setCurrentWordIndex(prev => prev + 1);
        setIsRevealed(false);
      } else {
        setGameState("CATEGORY_SELECT");
      }
    } else {
      // Logic for swiping back
      if (currentWordIndex > 0) {
        setCurrentWordIndex(prev => prev - 1);
        setIsRevealed(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCF0] text-[#141414] font-sans selection:bg-amber-100 p-4 md:p-8 flex flex-col items-center overflow-x-hidden relative">
      <header className="w-full max-w-2xl mb-8 flex justify-between items-center bg-white/50 backdrop-blur-md p-4 rounded-3xl border border-white shadow-sm">
        <div className="flex items-center gap-3">
          <motion.div 
            whileHover={{ rotate: 15 }}
            className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center shadow-lg transform -rotate-6"
          >
            <BookOpen className="text-white w-6 h-6" />
          </motion.div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Word Quest</h1>
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
                <label className="block">
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-widest pl-2">System Voice</span>
                  <select 
                    value={selectedVoiceURI}
                    onChange={(e) => setSelectedVoiceURI(e.target.value)}
                    className="mt-1 block w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold focus:outline-none focus:border-amber-400 transition-all appearance-none"
                  >
                    {voices.map(v => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </label>
                
                <p className="text-xs text-slate-400 italic px-2">
                  Choose a voice that Hanudhwaj finds easy to follow. Google UK English is recommended.
                </p>
                
                <button 
                  onClick={() => speak("Hello Hanudhwaj! Let's get that Gold!")}
                  className="w-full py-3 bg-amber-50 text-amber-600 font-bold rounded-2xl border-2 border-amber-100 hover:bg-amber-100 transition-colors"
                >
                  Test Voice
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="w-full max-w-md flex-grow flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {gameState === "START" && (
            <motion.div 
              key="start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-8 w-full"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black text-amber-500 italic">Hi Hanudhwaj!</h2>
                <p className="text-slate-500">Ready to win that Gold Medal?</p>
              </div>

              <div className="grid grid-cols-1 gap-4 w-full">
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
                  <div className="mt-8 bg-white p-6 rounded-[40px] shadow-sm border border-slate-100">
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
              <h2 className="text-2xl font-bold text-center">Choose a Subject</h2>
              <div className="grid grid-cols-1 gap-4">
                {ALL_CATEGORIES.filter(c => c !== "Practice").map(cat => (
                  <div key={cat} className="space-y-2">
                    <div className="flex gap-2">
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
                  className="w-full aspect-[4/5] bg-white rounded-[40px] shadow-2xl p-8 flex flex-col items-center justify-center relative transition-all border-b-[12px] border-amber-100 group cursor-grab active:cursor-grabbing"
                >
                <div className="flex-grow flex flex-col items-center justify-center text-center">
                  <h3 className="text-6xl font-black mb-4 group-hover:scale-105 transition-transform">{activeWord.word}</h3>
                  <button 
                    onClick={() => speak(activeWord.word, activeWord.language)}
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
                    {isLoadingInfo ? (
                      <div className="flex justify-center p-4">
                        <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      <>
                        <div className="p-4 bg-slate-50 rounded-2xl text-sm italic text-slate-700">{definition}</div>
                        <div className="p-4 bg-amber-50 rounded-2xl text-sm text-amber-800">"{example}"</div>
                      </>
                    )}
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
                    "w-full aspect-[4/5] max-h-[420px] bg-white rounded-[44px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-8 flex flex-col items-center justify-center relative overflow-hidden transition-colors border-b-[12px]",
                    isCorrect === true ? "border-green-500" : isCorrect === false ? "border-red-500" : "border-amber-100"
                  )}
                >
                  {!isRevealed ? (
                    <>
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => speak(activeWord.word, activeWord.language)}
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
                      
                      <div className="mt-8 flex gap-4 w-full">
                         <button
                           onClick={() => {
                             if (currentWordIndex > 0) {
                               setCurrentWordIndex(prev => prev - 1);
                               setUserInput("");
                               setIsCorrect(null);
                             }
                           }}
                           disabled={currentWordIndex === 0}
                           className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-30"
                         >
                           <ChevronRight className="w-5 h-5 rotate-180" />
                         </button>
                         <button
                           disabled={!userInput.trim()}
                           onClick={handleCheckSpelling}
                           className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-slate-800 disabled:opacity-50 transition-all shadow-[0_4px_0_0_#000] flex items-center justify-center gap-2"
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

                      {isLoadingInfo ? (
                        <div className="flex-grow flex flex-col items-center justify-center gap-4">
                          <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                            className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full" 
                          />
                          <p className="text-sm font-bold text-slate-400 italic">Asking Gemini for help...</p>
                        </div>
                      ) : (
                        <div className="space-y-6 flex-grow ">
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
                      )}
                    </motion.div>
                  )}

                  <div className="absolute top-8 right-8">
                    {isCorrect === true && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                        <CheckCircle2 className="w-12 h-12 text-green-500" />
                      </motion.div>
                    )}
                    {isCorrect === false && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                        <XCircle className="w-12 h-12 text-red-500" />
                      </motion.div>
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
                    <div className={cn("bg-white px-8 py-5 rounded-[40px] shadow-xl border-4", feedback.border)}>
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

      <footer className="mt-12 text-[10px] text-slate-300 font-mono tracking-widest uppercase flex items-center gap-4">
        <span>Hanudhwaj's Word Quest</span>
        <span>•</span>
        <span>Grade 3 Competition Prep</span>
      </footer>
    </div>
  );
}
