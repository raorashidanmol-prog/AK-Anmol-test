
import React, { useState } from 'react';
import { Test, QuizAttempt, TestCategory } from '../types';

interface StudentPortalProps {
  tests: Test[];
  attempts: QuizAttempt[];
  onStartTest: (test: Test) => void;
  onReviewAttempt: (attempt: QuizAttempt) => void;
  studentName: string;
}

const CATEGORY_MAP: Record<TestCategory, { label: string; icon: string; color: string; badge: string }> = {
  mcq_only: { label: 'MCQ Special', icon: '🔘', color: 'text-orange-600', badge: 'bg-orange-50' },
  short_answer_only: { label: 'Written Pro', icon: '✍️', color: 'text-emerald-600', badge: 'bg-emerald-50' },
  opposites_only: { label: 'Opposite Pro', icon: '🌓', color: 'text-purple-600', badge: 'bg-purple-50' },
  quiz: { label: 'Mega Quiz', icon: '🎒', color: 'text-sky-600', badge: 'bg-sky-50' },
  timed_challenge: { label: 'Speed Run', icon: '⚡', color: 'text-red-600', badge: 'bg-red-50' },
};

const StudentPortal: React.FC<StudentPortalProps> = ({ tests, attempts, onStartTest, onReviewAttempt, studentName }) => {
  const [activeTab, setActiveTab] = useState<TestCategory | 'all'>('all');
  const studentAttempts = attempts.filter(a => a.studentName === studentName);

  const filteredTests = activeTab === 'all' 
    ? tests 
    : tests.filter(t => t.category === activeTab);

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="bg-gradient-to-br from-indigo-500 via-sky-500 to-indigo-600 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 transition-transform group-hover:scale-110" />
        <h2 className="text-4xl font-black mb-2 drop-shadow-md">Welcome, {studentName}! 🌟</h2>
        <p className="text-indigo-50 font-medium opacity-90">Unlock your potential. Choose a challenge below!</p>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-10">
          <div className="bg-white/10 backdrop-blur-xl p-5 rounded-3xl border border-white/20 shadow-inner">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-100 mb-1">Trophies</p>
            <p className="text-3xl font-black">{studentAttempts.length} 🏆</p>
          </div>
          <div className="bg-white/10 backdrop-blur-xl p-5 rounded-3xl border border-white/20 shadow-inner">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-100 mb-1">XP Points</p>
            <p className="text-3xl font-black">{studentAttempts.reduce((acc, curr) => acc + curr.score, 0)} ✨</p>
          </div>
        </div>
      </div>

      <section className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <h3 className="text-3xl font-black text-gray-800 flex items-center gap-3">
            <span className="bg-sky-500 w-3 h-10 rounded-full" /> 
            Active Missions
          </h3>
          <div className="flex gap-2 bg-gray-100/50 p-1.5 rounded-3xl border border-gray-100 backdrop-blur-sm overflow-x-auto no-scrollbar w-full md:w-auto">
            <button 
              onClick={() => setActiveTab('all')}
              className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all ${activeTab === 'all' ? 'bg-white text-sky-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              All
            </button>
            {(Object.keys(CATEGORY_MAP) as TestCategory[]).map(cat => (
              <button 
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${activeTab === cat ? 'bg-white text-sky-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {CATEGORY_MAP[cat].icon} {CATEGORY_MAP[cat].label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredTests.length === 0 ? (
             <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-sky-100">
               <p className="text-gray-400 text-lg font-bold">No missions in this category yet! 🛸</p>
             </div>
          ) : (
            filteredTests.map(test => {
              const catInfo = CATEGORY_MAP[test.category] || CATEGORY_MAP.quiz;
              return (
                <div key={test.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-sky-50 hover:shadow-2xl hover:-translate-y-2 transition-all flex flex-col group relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-2 h-full ${catInfo.color.replace('text', 'bg')} opacity-40`} />
                  
                  <div className="flex justify-between items-start mb-6">
                    <span className={`${catInfo.badge} ${catInfo.color} text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-tighter`}>
                      {catInfo.icon} {catInfo.label}
                    </span>
                    <span className="text-gray-400 text-[10px] font-black tracking-widest uppercase">
                      ⏱️ {test.timeLimitMinutes}m
                    </span>
                  </div>
                  
                  <h4 className="text-2xl font-black text-gray-800 mb-4 group-hover:text-sky-600 transition-colors leading-tight">{test.title}</h4>
                  <p className="text-gray-400 text-sm font-medium mb-10 flex-1 line-clamp-2">{test.description}</p>
                  
                  <button 
                    onClick={() => onStartTest(test)}
                    className={`w-full ${catInfo.color.replace('text', 'bg')} hover:opacity-90 text-white font-black py-4 rounded-3xl shadow-xl transition-all transform active:scale-95 flex items-center justify-center gap-2`}
                  >
                    Accept Mission! 🚀
                  </button>
                </div>
              );
            })
          )}
        </div>
      </section>

      {studentAttempts.length > 0 && (
        <section className="space-y-8">
          <h3 className="text-3xl font-black text-gray-800 flex items-center gap-3">
             <span className="bg-indigo-500 w-3 h-10 rounded-full" /> 
             Mission Hall of Fame
          </h3>
          <div className="bg-white rounded-[3rem] border border-sky-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-sky-50/50 border-b border-sky-100">
                  <tr>
                    <th className="px-10 py-6 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Mission</th>
                    <th className="px-10 py-6 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Type</th>
                    <th className="px-10 py-6 text-left text-xs font-black text-gray-500 uppercase tracking-widest">XP Gained</th>
                    <th className="px-10 py-6 text-right text-xs font-black text-gray-500 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-50">
                  {studentAttempts.map((attempt, idx) => {
                    const test = tests.find(t => t.id === attempt.testId);
                    const catInfo = test ? CATEGORY_MAP[test.category] : CATEGORY_MAP.quiz;
                    return (
                      <tr key={idx} className="hover:bg-sky-50/30 transition-colors group">
                        <td className="px-10 py-6">
                           <p className="font-black text-gray-800 text-lg">{test?.title || 'Classified Mission'}</p>
                           <p className="text-xs text-gray-400 font-bold">{new Date(attempt.completedAt).toLocaleDateString()}</p>
                        </td>
                        <td className="px-10 py-6">
                           <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${catInfo.badge} ${catInfo.color}`}>
                             {catInfo.icon} {catInfo.label}
                           </span>
                        </td>
                        <td className="px-10 py-6">
                           <p className="text-xl font-black text-gray-700">{attempt.score} <span className="text-gray-300">/</span> {attempt.totalMarks}</p>
                        </td>
                        <td className="px-10 py-6 text-right">
                          <button 
                            onClick={() => onReviewAttempt(attempt)}
                            className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all transform hover:scale-105 ${
                            (attempt.score / attempt.totalMarks) >= 0.5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            View Review 🔍
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default StudentPortal;
