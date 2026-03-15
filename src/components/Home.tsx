import { motion } from 'motion/react';
import { Shield, Smartphone, Monitor, Info, Lock } from 'lucide-react';
import { AppMode } from '../App';

interface HomeProps {
  setMode: (mode: AppMode) => void;
  openInfo: () => void;
}

export function Home({ setMode, openInfo }: HomeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-zinc-900/80 border border-zinc-800 rounded-3xl backdrop-blur-xl p-8 shadow-[0_0_40px_rgba(16,185,129,0.05)]"
    >
      <div className="flex justify-center mb-6 relative">
        <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full"></div>
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="relative bg-zinc-950 p-4 rounded-2xl border border-zinc-800"
        >
          <Lock className="w-12 h-12 text-emerald-400" />
        </motion.div>
      </div>

      <h2 className="text-4xl font-bold text-center mb-2 text-zinc-100 tracking-tight">
        lock<span className="text-emerald-500">N</span>print
      </h2>
      
      <div className="flex justify-between items-center mb-8">
        <p className="text-zinc-500 text-sm font-mono uppercase tracking-wider">Secure Protocol</p>
        <button
          onClick={openInfo}
          className="flex items-center gap-2 text-zinc-500 hover:text-emerald-400 transition-colors text-sm font-mono uppercase tracking-wider"
        >
          <Info className="w-4 h-4" /> Details
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <button
          onClick={() => setMode('phone')}
          className="group relative overflow-hidden bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 text-zinc-200 py-4 px-6 rounded-xl font-medium transition-all flex items-center justify-center gap-4 shadow-lg"
        >
          <Smartphone className="w-6 h-6 text-emerald-500" />
          <div className="flex flex-col items-start">
            <span className="tracking-wide">Initialize Uplink</span>
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Mobile Client</span>
          </div>
        </button>

        <button
          onClick={() => setMode('pc')}
          className="group relative overflow-hidden bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50 text-zinc-200 py-4 px-6 rounded-xl font-medium transition-all flex items-center justify-center gap-4 shadow-lg"
        >
          <Monitor className="w-6 h-6 text-cyan-500" />
          <div className="flex flex-col items-start">
            <span className="tracking-wide">Host Terminal</span>
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">PC Receiver</span>
          </div>
        </button>
      </div>
    </motion.div>
  );
}
