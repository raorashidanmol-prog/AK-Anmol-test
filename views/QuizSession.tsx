
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Test, QuestionType, QuizAttempt, TestCategory } from '../types';

interface QuizSessionProps {
  test: Test;
  studentName: string;
  onFinish: (attempt: QuizAttempt) => void;
}

const CATEGORY_STYLE: Record<TestCategory, { theme: string; tag: string; label: string }> = {
  mcq_only: { theme: 'from-orange-400 to-orange-600', tag: 'bg-orange-100 text-orange-600', label: 'MCQ SPECIAL' },
  short_answer_only: { theme: 'from-emerald-400 to-emerald-600', tag: 'bg-emerald-100 text-emerald-600', label: 'WRITTEN PRO' },
  opposites_only: { theme: 'from-purple-400 to-purple-600', tag: 'bg-purple-100 text-purple-600', label: 'OPPOSITE PRO' },
  quiz: { theme: 'from-sky-400 to-indigo-600', tag: 'bg-sky-100 text-sky-600', label: 'MEGA QUIZ' },
  timed_challenge: { theme: 'from-red-500 to-pink-600', tag: 'bg-red-100 text-red-600', label: 'SPEED RUN ⚡' },
};

const QuizSession: React.FC<QuizSessionProps> = ({ test, studentName, onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(test.timeLimitMinutes * 60);
  const [jumbledSelection, setJumbledSelection] = useState<string[]>([]);

  const isRTL = test.language === 'ur' || test.language === 'sd';
  const categoryConfig = CATEGORY_STYLE[test.category] || CATEGORY_STYLE.quiz;

  const currentQuestion = test.questions[currentIndex];

  const scrambledWords = useMemo(() => {
    if (currentQuestion.type !== QuestionType.JUMBLED) return [];
    return currentQuestion.correctAnswer
      .split(' ')
      .filter(w => w.trim() !== '')
      .sort(() => Math.random() - 0.5);
  }, [currentQuestion]);

  const handleWordClick = (word: string) => {
    const newSelection = [...jumbledSelection, word];
    setJumbledSelection(newSelection);
    setAnswers({ ...answers, [currentQuestion.id]: newSelection.join(' ') });
  };

  const resetJumbled = () => {
    setJumbledSelection([]);
    setAnswers({ ...answers, [currentQuestion.id]: '' });
  };

  const calculateScore = useCallback(() => {
    let score = 0;
    test.questions.forEach(q => {
      const userAnswer = (answers[q.id] || '').toLowerCase().trim();
      const correctAnswer = q.correctAnswer.toLowerCase().trim();
      const clean = (s: string) => s.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").replace(/\s{2,}/g," ");
      if (clean(userAnswer) === clean(correctAnswer)) {
        score += q.marks;
      }
    });
    return score;
  }, [test.questions, answers]);

  const handleSubmit = useCallback(() => {
    const totalMarks = test.questions.reduce((acc, q) => acc + q.marks, 0);
    const score = calculateScore();
    const attempt: QuizAttempt = {
      id: `attempt-${Date.now()}`,
      testId: test.id,
      studentName,
      score,
      totalMarks,
      completedAt: Date.now(),
      answers // Save answers for review
    };
    onFinish(attempt);
  }, [test, studentName, calculateScore, onFinish, answers]);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, handleSubmit]);

  useEffect(() => {
    const existing = answers[currentQuestion.id] || '';
    setJumbledSelection(existing ? existing.split(' ') : []);
  }, [currentIndex, currentQuestion.id]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progress = ((currentIndex + 1) / test.questions.length) * 100;

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in zoom-in-95 duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-8 rounded-[2.5rem] shadow-xl border border-sky-50 gap-6 relative overflow-hidden">
        {test.category === 'timed_challenge' && (
           <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse" />
        )}
        <div className="flex items-center gap-6">
          <div className={`p-6 rounded-3xl font-black text-3xl shadow-lg transition-all duration-500 scale-110 ${timeLeft < 60 ? 'bg-red-500 text-white animate-bounce' : 'bg-sky-500 text-white'}`}>
            {formatTime(timeLeft)}
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>
            <span className={`${categoryConfig.tag} text-[10px] font-black px-3 py-1 rounded-full tracking-widest uppercase mb-1 inline-block`}>
               {categoryConfig.label}
            </span>
            <h2 className="text-2xl font-black text-gray-800">{test.title}</h2>
          </div>
        </div>
        <div className="w-full sm:w-40 bg-gray-100 rounded-full h-5 overflow-hidden border-4 border-white shadow-inner relative">
          <div 
            className={`bg-gradient-to-r ${categoryConfig.theme} h-full rounded-full transition-all duration-1000 ease-out relative`}
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 w-full h-full animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          </div>
        </div>
      </div>

      <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-sky-50 min-h-[450px] flex flex-col relative">
        <div className={`mb-10 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="flex items-center gap-3 mb-4 justify-start">
            <span className="text-sky-500 font-black text-xl tracking-tighter uppercase">
              {isRTL ? 'سوال' : 'Step'} {currentIndex + 1}
            </span>
            <span className="text-gray-200 text-xl font-bold">/</span>
            <span className="text-gray-400 font-black">{test.questions.length}</span>
          </div>
          <h3 className="text-3xl font-black text-gray-800 leading-tight">
            {currentQuestion.type === QuestionType.OPPOSITE ? (
              isRTL ? `لفظ "${currentQuestion.question}" کا الٹ لکھیں` : `What is the opposite of "${currentQuestion.question}"?`
            ) : currentQuestion.question}
          </h3>
        </div>

        <div className="flex-1 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
          {currentQuestion.type === QuestionType.MCQ ? (
            <div className="grid grid-cols-1 gap-4">
              {currentQuestion.options?.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setAnswers({ ...answers, [currentQuestion.id]: opt })}
                  className={`p-6 rounded-[2rem] border-4 text-left font-black text-lg transition-all flex items-center justify-between group transform hover:scale-[1.02] active:scale-95 ${
                    answers[currentQuestion.id] === opt 
                    ? 'border-sky-500 bg-sky-50 text-sky-800 shadow-xl shadow-sky-100' 
                    : 'border-gray-50 bg-gray-50/30 hover:border-sky-200 text-gray-600'
                  }`}
                >
                  <span className={isRTL ? 'text-right flex-1' : 'text-left'}>{opt}</span>
                  <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center transition-all ${
                    answers[currentQuestion.id] === opt ? 'border-sky-500 bg-sky-500 rotate-[360deg]' : 'border-gray-200 bg-white'
                  }`}>
                    {answers[currentQuestion.id] === opt && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                </button>
              ))}
            </div>
          ) : currentQuestion.type === QuestionType.JUMBLED ? (
            <div className="space-y-8 animate-in fade-in duration-300">
               <div className="p-8 bg-gray-50/50 rounded-[2.5rem] border-4 border-dashed border-sky-100 min-h-[120px] flex flex-wrap gap-2 items-center justify-center">
                  {jumbledSelection.length === 0 && (
                    <p className="text-gray-300 font-bold italic">Tap words below to arrange them...</p>
                  )}
                  {jumbledSelection.map((word, i) => (
                    <div key={i} className="bg-sky-500 text-white px-5 py-2 rounded-2xl font-black shadow-md shadow-sky-100 animate-in bounce-in">
                      {word}
                    </div>
                  ))}
               </div>
               <div className="flex flex-wrap gap-3 justify-center">
                  {scrambledWords.map((word, i) => {
                    const countInSelection = jumbledSelection.filter(w => w === word).length;
                    const countInOriginal = scrambledWords.filter(w => w === word).length;
                    const isUsed = countInSelection >= countInOriginal;
                    return (
                      <button
                        key={i}
                        disabled={isUsed}
                        onClick={() => handleWordClick(word)}
                        className={`px-6 py-3 rounded-2xl font-bold border-4 transition-all transform active:scale-95 ${
                          isUsed 
                          ? 'bg-gray-100 border-gray-100 text-gray-300 cursor-not-allowed' 
                          : 'bg-white border-sky-100 text-sky-600 hover:border-sky-500 hover:shadow-lg shadow-sm'
                        }`}
                      >
                        {word}
                      </button>
                    );
                  })}
               </div>
               <div className="flex justify-center">
                  <button onClick={resetJumbled} className="text-xs font-black text-red-400 hover:text-red-600 transition-colors uppercase tracking-widest flex items-center gap-1">🔄 Clear Selection</button>
               </div>
            </div>
          ) : (
            <textarea
              dir={isRTL ? 'rtl' : 'ltr'}
              className="w-full border-4 border-gray-50 bg-gray-50/20 rounded-[2rem] p-8 focus:border-sky-400 focus:bg-white focus:ring-8 focus:ring-sky-50 outline-none text-xl font-bold min-h-[150px] transition-all shadow-inner"
              placeholder={
                currentQuestion.type === QuestionType.OPPOSITE 
                  ? (isRTL ? "الٹ یہاں لکھیں..." : "Type the opposite word...")
                  : (isRTL ? "...جواب یہاں لکھیں" : "Unleash your answer here...")
              }
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
            />
          )}
        </div>

        <div className="mt-12 flex justify-between items-center border-t border-gray-50 pt-10">
          <button
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className={`font-black px-8 py-4 rounded-2xl transition-all uppercase tracking-widest text-xs ${
              currentIndex === 0 ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
            }`}
          >
            {isRTL ? '← پچھلا' : '← Back'}
          </button>
          {currentIndex === test.questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              className={`bg-gradient-to-r ${categoryConfig.theme} text-white font-black px-12 py-5 rounded-[2rem] shadow-2xl hover:brightness-110 transition-all transform active:scale-95 flex items-center gap-3 uppercase tracking-widest`}
            >
              {isRTL ? 'مشن مکمل ✨' : 'Complete ✨'}
            </button>
          ) : (
            <button
              onClick={() => setCurrentIndex(prev => Math.min(test.questions.length - 1, prev + 1))}
              className={`bg-gradient-to-r ${categoryConfig.theme} text-white font-black px-12 py-5 rounded-[2rem] shadow-xl hover:brightness-110 transition-all transform active:scale-95 uppercase tracking-widest`}
            >
              {isRTL ? 'اگلا →' : 'Next →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizSession;
