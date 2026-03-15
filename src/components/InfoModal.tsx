import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, Link, FolderOpen, Ban, Bomb, Monitor, Smartphone, Wrench, Lock } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InfoModal({ isOpen, onClose }: InfoModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-zinc-950 text-zinc-300 border border-zinc-800 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.1)] w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
          >
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/50">
              <h3 className="text-xl font-bold flex items-center gap-3 text-zinc-100 tracking-tight">
                <Lock className="w-5 h-5 text-emerald-500" /> lock<span className="text-emerald-500">N</span>print
              </h3>
              <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar">
              <p className="text-zinc-400 leading-relaxed">
                <strong className="text-zinc-200">lockNprint</strong> is a secure, peer-to-peer protocol for transmitting documents from a mobile device to a host terminal. Files are transferred directly via WebRTC and never touch a centralized server.
              </p>
              
              <div>
                <h4 className="text-emerald-500 font-mono text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Security Features
                </h4>
                <ul className="space-y-3 text-sm text-zinc-400">
                  <li className="flex items-center gap-3"><Shield className="w-4 h-4 text-emerald-500" /> End-to-End Privacy - Zero server storage</li>
                  <li className="flex items-center gap-3"><Link className="w-4 h-4 text-cyan-500" /> Direct WebRTC Data Channels</li>
                  <li className="flex items-center gap-3"><FolderOpen className="w-4 h-4 text-yellow-500" /> In-Memory Processing</li>
                  <li className="flex items-center gap-3"><Ban className="w-4 h-4 text-red-500" /> Anti-Tamper UI (Right-click/Inspect blocked)</li>
                  <li className="flex items-center gap-3"><Bomb className="w-4 h-4 text-orange-500" /> Auto-Destruct - Files wiped after printing</li>
                </ul>
              </div>

              <div>
                <h4 className="text-cyan-500 font-mono text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Monitor className="w-4 h-4" /> Operating Procedure
                </h4>
                <div className="space-y-6 text-sm text-zinc-400">
                  <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
                    <strong className="text-zinc-200 flex items-center gap-2 mb-3"><Monitor className="w-4 h-4 text-cyan-500" /> Host Terminal (PC):</strong>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                      <li>Initialize "Host Terminal" mode</li>
                      <li>Display the generated Auth Code / QR</li>
                      <li>Await incoming secure uplink</li>
                      <li>Review and execute PRINT commands</li>
                    </ol>
                  </div>
                  <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
                    <strong className="text-zinc-200 flex items-center gap-2 mb-3"><Smartphone className="w-4 h-4 text-emerald-500" /> Mobile Uplink:</strong>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                      <li>Initialize "Mobile Uplink" mode</li>
                      <li>Scan QR or enter the 8-char Auth Code</li>
                      <li>Select files for transmission</li>
                      <li>Review queue and execute TRANSMIT</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-zinc-500 font-mono text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Wrench className="w-4 h-4" /> System Info
                </h4>
                <ul className="space-y-2 text-sm text-zinc-400 font-mono">
                  <li>Version: <strong className="text-zinc-200">v2.0.0-SECURE</strong></li>
                  <li>Core: React, WebRTC, Firebase Signaling</li>
                </ul>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end">
              <button
                onClick={onClose}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-6 py-2 rounded-xl transition-colors font-mono text-sm uppercase tracking-wider"
              >
                Acknowledge
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
