
import React from 'react';
import { QuizAttempt, Test, QuestionType } from '../types';

interface ResultReviewProps {
  attempt: QuizAttempt;
  test?: Test;
  onClose: () => void;
}

const ResultReview: React.FC<ResultReviewProps> = ({ attempt, test, onClose }) => {
  if (!test) {
    return (
      <div className="text-center py-20 bg-white rounded-[3rem] border border-sky-100">
        <p className="text-gray-500 font-bold">Mission data no longer available. 🛸</p>
        <button onClick={onClose} className="mt-4 text-sky-500 font-black uppercase">Close</button>
      </div>
    );
  }

  const scorePercentage = (attempt.score / attempt.totalMarks) * 100;
  const isRTL = test.language === 'ur' || test.language === 'sd';

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-sky-50 text-center relative overflow-hidden">
        <div className={`absolute inset-0 opacity-5 pointer-events-none ${scorePercentage >= 50 ? 'bg-green-500' : 'bg-red-500'}`} />
        
        <h2 className="text-4xl font-black text-gray-800 mb-2">Mission Report 📝</h2>
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-8">{test.title}</p>
        
        <div className="flex flex-col items-center gap-2">
          <div className={`text-6xl font-black ${scorePercentage >= 50 ? 'text-green-500' : 'text-red-500'}`}>
            {attempt.score} <span className="text-gray-200">/</span> {attempt.totalMarks}
          </div>
          <p className="text-gray-400 font-bold">Final XP Score</p>
          <div className="w-48 h-2 bg-gray-100 rounded-full mt-4 overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ${scorePercentage >= 50 ? 'bg-green-500' : 'bg-red-500'}`}
              style={{ width: `${scorePercentage}%` }}
            />
          </div>
        </div>

        <button 
          onClick={onClose}
          className="mt-10 bg-gray-100 hover:bg-gray-200 text-gray-600 font-black px-10 py-4 rounded-3xl transition-all uppercase tracking-widest text-xs"
        >
          Return to Hub
        </button>
      </div>

      <div className="space-y-6">
        <h3 className="text-2xl font-black text-gray-800 flex items-center gap-3 ml-4">
          <span className="bg-sky-500 w-2 h-8 rounded-full" />
          Detail Analysis
        </h3>

        {test.questions.map((q, idx) => {
          const userAnswer = (attempt.answers[q.id] || '').trim();
          const correctAnswer = q.correctAnswer.trim();
          
          const clean = (s: string) => s.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").replace(/\s{2,}/g," ");
          const isCorrect = clean(userAnswer) === clean(correctAnswer);

          return (
            <div 
              key={q.id} 
              className={`bg-white p-8 rounded-[2.5rem] shadow-sm border-4 transition-all ${
                isCorrect ? 'border-green-50' : 'border-red-50'
              }`}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <div className={`flex items-center gap-4 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className={`font-black text-sm w-10 h-10 rounded-full flex items-center justify-center ${
                  isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}>
                  {isCorrect ? '✓' : '✕'}
                </span>
                <p className="text-gray-400 font-black text-xs uppercase tracking-widest">Question {idx + 1} • 1 Mark</p>
              </div>

              <h4 className="text-xl font-black text-gray-800 mb-8 leading-relaxed">
                {q.question}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Your Answer</p>
                  <div className={`p-5 rounded-2xl font-bold border-2 ${
                    isCorrect ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'
                  }`}>
                    {userAnswer || (isRTL ? 'کوئی جواب نہیں دیا' : 'No answer provided')}
                  </div>
                </div>

                {!isCorrect && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Correct Solution</p>
                    <div className="p-5 rounded-2xl font-bold border-2 bg-blue-50 border-blue-100 text-blue-700">
                      {correctAnswer}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ResultReview;
