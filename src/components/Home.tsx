import { motion } from 'motion/react';
import { Shield, Smartphone, Monitor, Info } from 'lucide-react';
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
      className="bg-white/10 border border-white/15 rounded-3xl backdrop-blur-md p-8 shadow-2xl"
    >
      <div className="flex justify-center mb-6">
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        >
          <Shield className="w-16 h-16 text-yellow-400" />
        </motion.div>
      </div>

      <h2 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-yellow-400 to-purple-500 bg-clip-text text-transparent">
        lockNprint
      </h2>
      
      <div className="flex justify-between items-center mb-8">
        <p className="text-white/70 text-sm">Secure & Smart Print Sharing</p>
        <button
          onClick={openInfo}
          className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm"
        >
          <Info className="w-4 h-4" /> Details
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <button
          onClick={() => setMode('phone')}
          className="group relative overflow-hidden bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white border-none py-4 px-6 rounded-xl font-medium transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-indigo-500/50 hover:scale-[1.02]"
        >
          <Smartphone className="w-5 h-5" />
          <div className="flex flex-col items-start">
            <span>Connect To PC</span>
            <span className="text-[10px] text-white/70">For Mobile User</span>
          </div>
        </button>

        <button
          onClick={() => setMode('pc')}
          className="group relative overflow-hidden bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white border-none py-4 px-6 rounded-xl font-medium transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-indigo-500/50 hover:scale-[1.02]"
        >
          <Monitor className="w-5 h-5" />
          <div className="flex flex-col items-start">
            <span>Connect To Phone</span>
            <span className="text-[10px] text-white/70">Only PC</span>
          </div>
        </button>
      </div>
    </motion.div>
  );
}
