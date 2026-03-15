import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Copy, Info, FileText, Printer, CheckCircle } from 'lucide-react';
import { AppMode } from '../App';
import { generateRoomCode } from '../lib/utils';
import Peer, { DataConnection } from 'peerjs';
import { ref, set, remove } from 'firebase/database';
import { db } from '../lib/firebase';

interface PCModeProps {
  setMode: (mode: AppMode) => void;
}

interface ReceivedFile {
  id: string;
  name: string;
  type: string;
  data: string; // Object URL
}

export function PCMode({ setMode }: PCModeProps) {
  const [roomCode] = useState(() => generateRoomCode());
  const [status, setStatus] = useState('Initializing...');
  const [isConnected, setIsConnected] = useState(false);
  const [files, setFiles] = useState<ReceivedFile[]>([]);
  const [printCount, setPrintCount] = useState(0);
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);

  useEffect(() => {
    // Initialize PeerJS
    const peer = new Peer(`locknprint-${roomCode}`);
    peerRef.current = peer;

    peer.on('open', (id) => {
      setStatus('Waiting for connection...');
      // Register room in Firebase for discovery
      set(ref(db, `rooms/${roomCode}`), {
        host: true,
        timestamp: Date.now()
      });
    });

    peer.on('connection', (conn) => {
      connRef.current = conn;
      setIsConnected(true);
      setStatus('Connected to Phone');

      conn.on('data', (data: any) => {
        if (data.type === 'file') {
          const blob = new Blob([data.data], { type: data.fileType });
          const url = URL.createObjectURL(blob);
          setFiles(prev => [...prev, {
            id: data.id,
            name: data.name,
            type: data.fileType,
            data: url
          }]);
        }
      });

      conn.on('close', () => {
        setIsConnected(false);
        setStatus('Phone disconnected');
      });
    });

    peer.on('error', (err) => {
      console.error(err);
      setStatus('Connection error');
    });

    return () => {
      remove(ref(db, `rooms/${roomCode}`));
      peer.destroy();
      // Cleanup Object URLs
      files.forEach(f => URL.revokeObjectURL(f.data));
    };
  }, [roomCode]);

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setStatus('Code copied to clipboard');
    setTimeout(() => {
      setStatus(isConnected ? 'Connected to Phone' : 'Waiting for connection...');
    }, 2000);
  };

  const handlePrint = async () => {
    if (files.length === 0) return;
    setStatus('Preparing to print...');

    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      let yOffset = 10;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          const img = new Image();
          img.src = file.data;
          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              if (ctx) {
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                ctx.drawImage(img, 0, 0);
                const imgData = canvas.toDataURL('image/jpeg', 0.8);
                
                const maxWidth = 190;
                const ratio = img.naturalHeight / img.naturalWidth;
                const height = maxWidth * ratio;

                if (yOffset + height > 280 && i > 0) {
                  doc.addPage();
                  yOffset = 10;
                }

                doc.addImage(imgData, 'JPEG', 10, yOffset, maxWidth, height);
                yOffset += height + 10;
              }
              resolve();
            };
            img.onerror = reject;
          });
        } else if (file.type === 'application/pdf') {
          doc.text(`PDF Document: ${file.name} (Open separately to print)`, 10, yOffset);
          yOffset += 20;
          if (yOffset > 280) {
            doc.addPage();
            yOffset = 10;
          }
        }
      }

      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(url, '_blank');
      
      if (!printWindow) {
        setStatus('Popup blocked! Please allow popups.');
        URL.revokeObjectURL(url);
        return;
      }

      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
        setTimeout(() => {
          printWindow.close();
          URL.revokeObjectURL(url);
        }, 1000);
      };

      setPrintCount(prev => prev + 1);
      
      // Cleanup old URLs
      files.forEach(f => URL.revokeObjectURL(f.data));
      setFiles([]); // Auto destroy files
      setStatus('Printed successfully');
      
      // Notify phone
      if (connRef.current) {
        connRef.current.send({ type: 'printed' });
      }

    } catch (err) {
      console.error(err);
      setStatus('Print failed');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white/10 border border-white/15 rounded-3xl backdrop-blur-md p-8 shadow-2xl"
    >
      <button
        onClick={() => setMode('home')}
        className="text-white/50 hover:text-white mb-6 flex items-center gap-2 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-center gap-2 text-cyan-400 mb-6 text-sm font-medium">
        <Info className="w-4 h-4" />
        <span>{status}</span>
      </div>

      <div className="text-center mb-8">
        <h5 className="text-pink-400 font-medium mb-2">Room Code:</h5>
        <div className="flex items-center justify-center gap-4">
          <div className="text-4xl tracking-widest font-mono bg-indigo-500/20 px-6 py-2 rounded-xl text-white">
            {roomCode}
          </div>
          <button
            onClick={copyCode}
            className="text-purple-400 hover:text-purple-300 hover:scale-110 transition-all p-2"
          >
            <Copy className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex justify-center mb-8 bg-white p-4 rounded-2xl w-fit mx-auto">
        <QRCodeSVG value={roomCode} size={200} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-yellow-400/90 text-black p-4 rounded-xl font-bold flex items-center gap-3">
          <FileText className="w-5 h-5" />
          <span>Files: {files.length}</span>
        </div>
        <div className="bg-yellow-400/90 text-black p-4 rounded-xl font-bold flex items-center gap-3">
          <Printer className="w-5 h-5" />
          <span>Prints: {printCount}</span>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mb-6 max-h-40 overflow-y-auto space-y-2 pr-2">
          {files.map(f => (
            <div key={f.id} className="flex items-center gap-3 bg-white/5 p-3 rounded-lg text-sm">
              <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
              <span className="truncate">{f.name}</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handlePrint}
        disabled={files.length === 0}
        className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white border-none py-4 px-6 rounded-xl font-medium transition-all flex items-center justify-center gap-3 shadow-lg"
      >
        <Printer className="w-5 h-5" />
        Print All
      </button>
    </motion.div>
  );
}
