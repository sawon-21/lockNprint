import { useState, useEffect, lazy, Suspense } from 'react';
import { AnimatePresence } from 'motion/react';
import { Home } from './components/Home';

const PCMode = lazy(() => import('./components/PCMode').then(m => ({ default: m.PCMode })));
const PhoneMode = lazy(() => import('./components/PhoneMode').then(m => ({ default: m.PhoneMode })));
const InfoModal = lazy(() => import('./components/InfoModal').then(m => ({ default: m.InfoModal })));

export type AppMode = 'home' | 'pc' | 'phone';

export default function App() {
  const [mode, setMode] = useState<AppMode>('home');
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  // Security: Disable right-click, shortcuts, and dev tools
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === 's' || e.key === 'S' || e.key === 'u' || e.key === 'U')) e.preventDefault();
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J'))) e.preventDefault();
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e1e2f] via-[#2a2a4a] to-[#3b3b6a] text-[#e0e0e0] font-sans flex justify-center items-center overflow-x-hidden select-none p-4">
      <div className="w-full max-w-lg">
        <Suspense fallback={<LoadingFallback />}>
          <AnimatePresence mode="wait">
            {mode === 'home' && <Home key="home" setMode={setMode} openInfo={() => setIsInfoOpen(true)} />}
            {mode === 'pc' && <PCMode key="pc" setMode={setMode} />}
            {mode === 'phone' && <PhoneMode key="phone" setMode={setMode} />}
          </AnimatePresence>
        </Suspense>
      </div>

      <Suspense fallback={null}>
        <InfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />
      </Suspense>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex justify-center items-center h-64 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md shadow-2xl">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
  );
}
