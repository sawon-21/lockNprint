import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, Link, FolderOpen, Ban, Bomb, Monitor, Smartphone, Wrench } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InfoModal({ isOpen, onClose }: InfoModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-[#1e1e2f] text-[#e0e0e0] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
          >
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <h3 className="text-xl font-bold flex items-center gap-2 text-indigo-400">
                <Shield className="w-6 h-6" /> lockNprint - Secure Print
              </h3>
              <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <p><strong>lockNprint</strong> is a secure web app where you can print files from your mobile using a QR code or PIN without downloading or saving to a server.</p>
              
              <div>
                <h4 className="text-yellow-400 font-bold mb-3 flex items-center gap-2"><Shield className="w-5 h-5" /> Features</h4>
                <ul className="space-y-2 text-sm text-white/80">
                  <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-green-400" /> 100% Privacy - Files never touch a server</li>
                  <li className="flex items-center gap-2"><Link className="w-4 h-4 text-blue-400" /> Connect via QR or Code</li>
                  <li className="flex items-center gap-2"><FolderOpen className="w-4 h-4 text-yellow-400" /> Mobile → PC Print</li>
                  <li className="flex items-center gap-2"><Ban className="w-4 h-4 text-red-400" /> Downloads, Copying, Inspect blocked</li>
                  <li className="flex items-center gap-2"><Bomb className="w-4 h-4 text-orange-400" /> Files auto-destroy after printing</li>
                </ul>
              </div>

              <div>
                <h4 className="text-yellow-400 font-bold mb-3 flex items-center gap-2"><Monitor className="w-5 h-5" /> How to Use</h4>
                <div className="space-y-4 text-sm text-white/80">
                  <div>
                    <strong className="text-white flex items-center gap-2 mb-1"><Monitor className="w-4 h-4" /> PC:</strong>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Click "Connect to Phone"</li>
                      <li>You will get a QR/Code</li>
                      <li>When mobile connects, files will appear</li>
                      <li>Click Print to print all files</li>
                    </ol>
                  </div>
                  <div>
                    <strong className="text-white flex items-center gap-2 mb-1"><Smartphone className="w-4 h-4" /> Mobile:</strong>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Select "Connect to PC"</li>
                      <li>Enter Code or Scan QR</li>
                      <li>Upload files</li>
                      <li>Files will be sent securely to PC</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-yellow-400 font-bold mb-3 flex items-center gap-2"><Wrench className="w-5 h-5" /> Updates & Development</h4>
                <ul className="space-y-2 text-sm text-white/80">
                  <li>Current Version: <strong>v1.0.0</strong></li>
                  <li>Built with React, WebRTC, and Firebase</li>
                </ul>
              </div>
            </div>

            <div className="p-4 border-t border-white/10 flex justify-end">
              <button
                onClick={onClose}
                className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
