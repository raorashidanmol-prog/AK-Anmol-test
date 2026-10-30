
import React, { useState } from 'react';
import { UserRole } from '../types';

interface LoginViewProps {
  onLogin: (name: string, role: UserRole) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }

    if (role === 'teacher') {
      if (password === 'admin123' || password === '1234') {
        onLogin(name, role);
      } else {
        setError('Incorrect teacher password. Try "1234".');
      }
    } else {
      onLogin(name, role);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Background Image Layer */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 hover:scale-105"
        style={{ 
          backgroundImage: `url('https://files.oaiusercontent.com/file-K1f5e88C7N4tU6X8XW9fS3?se=2025-01-30T17%3A46%3A31Z&sp=r&sv=2024-08-04&sr=b&rscc=max-age%3D604800%2C%20immutable%2C%20private&rscd=attachment%3B%20filename%3D322d861d-7212-45e3-85f0-621e25e1df11.webp&sig=6B1pY/5vJ03Q6I3D2j9k/p3fK07K0M8X5vJ03Q6I3D2j9k%3D')`,
        }}
      >
        {/* Darker overlay for better readability */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      </div>

      {/* Login Card Container */}
      <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in duration-700">
        <div className="bg-white/90 backdrop-blur-xl p-10 rounded-[3rem] shadow-2xl border-4 border-white/50 relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${role === 'student' ? 'from-sky-400 to-sky-600' : 'from-indigo-400 to-indigo-600'}`} />
          
          <div className="text-center mb-8">
            <h2 className="text-4xl font-black text-gray-800 tracking-tight mb-2">Anmol AK Test</h2>
            <div className="inline-block px-4 py-1 bg-sky-100 text-sky-600 rounded-full text-[10px] font-black uppercase tracking-widest">
              By Rashid Anmol
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Choose Your Role</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => { setRole('student'); setError(''); }}
                  className={`p-4 rounded-3xl border-4 transition-all flex flex-col items-center gap-2 transform active:scale-95 ${
                    role === 'student' 
                    ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-lg shadow-sky-100' 
                    : 'border-white bg-white/50 hover:border-sky-100 text-gray-400'
                  }`}
                >
                  <span className="text-3xl">🎒</span>
                  <span className="font-black text-xs">Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setRole('teacher'); setError(''); }}
                  className={`p-4 rounded-3xl border-4 transition-all flex flex-col items-center gap-2 transform active:scale-95 ${
                    role === 'teacher' 
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-lg shadow-indigo-100' 
                    : 'border-white bg-white/50 hover:border-indigo-100 text-gray-400'
                  }`}
                >
                  <span className="text-3xl">👨‍🏫</span>
                  <span className="font-black text-xs">Teacher</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 ml-1 mb-2">User Name</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">👤</span>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border-4 border-white bg-white/80 focus:bg-white focus:border-sky-400 focus:outline-none transition-all text-lg font-bold placeholder:text-gray-300 shadow-inner"
                    placeholder="Enter Name"
                    required
                  />
                </div>
              </div>

              {role === 'teacher' && (
                <div className="animate-in slide-in-from-top duration-300">
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 ml-1 mb-2">Access Key</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔑</span>
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border-4 border-white bg-white/80 focus:bg-white focus:border-indigo-400 focus:outline-none transition-all text-lg font-bold placeholder:text-gray-300 shadow-inner"
                      placeholder="Enter Key"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 ml-1 font-bold italic">Default key: 1234</p>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-black border-2 border-red-100 animate-pulse">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              className={`w-full py-5 rounded-[2rem] text-white font-black text-lg shadow-2xl transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 ${
                role === 'student' ? 'bg-sky-500 hover:bg-sky-600 shadow-sky-200' : 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-200'
              }`}
            >
              Start Adventure! 🚀
            </button>
          </form>
        </div>
        
        <p className="text-center mt-6 text-white/70 text-xs font-bold tracking-widest uppercase">
          Learning powered by Anmol AK
        </p>
      </div>
    </div>
  );
};

export default LoginView;
