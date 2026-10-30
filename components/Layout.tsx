
import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: { name: string; role: UserRole } | null;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
      console.log('App was installed');
    });

    // Check if already in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-sky-100 px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-sky-500 p-2 rounded-xl">
             <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
             </svg>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent">
            Anmol AK Test
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {deferredPrompt && !isInstalled && (
            <button 
              onClick={handleInstall}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-all transform active:scale-95 border border-indigo-100"
            >
              <span>📲</span> Install App
            </button>
          )}

          {user && (
            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <p className="text-sm font-semibold text-gray-800">{user.name}</p>
                <p className="text-xs text-sky-500 capitalize">{user.role} Account</p>
              </div>
              <button 
                onClick={onLogout}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6">
        {deferredPrompt && !isInstalled && (
           <div className="mb-6 sm:hidden bg-indigo-600 text-white p-4 rounded-3xl flex justify-between items-center shadow-lg animate-bounce">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📱</span>
                <p className="text-sm font-bold">Install App for better experience!</p>
              </div>
              <button 
                onClick={handleInstall}
                className="bg-white text-indigo-600 px-4 py-2 rounded-xl font-black text-xs"
              >
                INSTALL
              </button>
           </div>
        )}
        {children}
      </main>

      <footer className="bg-white border-t border-sky-100 py-6 text-center text-gray-400 text-sm">
        &copy; 2024 Anmol AK Test. Learning made fun! 🚀
      </footer>
    </div>
  );
};

export default Layout;
