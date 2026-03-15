import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Info, Link as LinkIcon, Upload, FileText, Printer, Camera } from 'lucide-react';
import { AppMode } from '../App';
import Peer, { DataConnection } from 'peerjs';
import type { Html5Qrcode } from 'html5-qrcode';
import { ref, get } from 'firebase/database';
import { db } from '../lib/firebase';

interface PhoneModeProps {
  setMode: (mode: AppMode) => void;
}

export function PhoneMode({ setMode }: PhoneModeProps) {
  const [roomCode, setRoomCode] = useState('');
  const [status, setStatus] = useState('Enter Code or Scan QR');
  const [isConnected, setIsConnected] = useState(false);
  const [sentFiles, setSentFiles] = useState(0);
  const [printCount, setPrintCount] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const peer = new Peer();
    peerRef.current = peer;

    peer.on('error', (err) => {
      console.error(err);
      setStatus('Connection error');
    });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
      peer.destroy();
    };
  }, []);

  const startScanner = async () => {
    setIsScanning(true);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;
      
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (decodedText.length === 8) {
            setRoomCode(decodedText);
            html5QrCode.stop();
            setIsScanning(false);
            connectToPC(decodedText);
          } else {
            setStatus('Invalid QR code');
          }
        },
        (errorMessage) => {
          // ignore parse errors
        }
      );
    } catch (err) {
      console.error(err);
      setStatus('Camera access denied');
      setIsScanning(false);
    }
  };

  const connectToPC = async (codeToUse?: string) => {
    const code = (codeToUse || roomCode).toUpperCase();
    if (code.length !== 8) {
      setStatus('Enter a valid 8-character code');
      return;
    }

    setStatus('Connecting...');
    
    try {
      // Check if room exists in Firebase
      const snapshot = await get(ref(db, `rooms/${code}/host`));
      if (!snapshot.exists()) {
        setStatus('PC not online');
        return;
      }

      if (peerRef.current) {
        const conn = peerRef.current.connect(`locknprint-${code}`, {
          reliable: true
        });
        
        connRef.current = conn;

        conn.on('open', () => {
          setIsConnected(true);
          setStatus('Connected to PC');
        });

        conn.on('data', (data: any) => {
          if (data.type === 'printed') {
            setPrintCount(prev => prev + 1);
            setSentFiles(0);
            setStatus('Files printed successfully');
          }
        });

        conn.on('close', () => {
          setIsConnected(false);
          setStatus('Disconnected from PC');
        });
      }
    } catch (err) {
      console.error(err);
      setStatus('Connection failed');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !connRef.current) return;

    setStatus('Uploading files...');
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 10 * 1024 * 1024) {
        setStatus(`File ${file.name} is too large (>10MB)`);
        continue;
      }

      try {
        const arrayBuffer = await file.arrayBuffer();
        connRef.current.send({
          type: 'file',
          id: Math.random().toString(36).substring(7),
          name: file.name,
          fileType: file.type,
          data: arrayBuffer
        });
        successCount++;
      } catch (err) {
        console.error('Failed to read file', err);
      }
    }

    if (successCount > 0) {
      setSentFiles(prev => prev + successCount);
      setStatus(`Sent ${successCount} file(s) successfully`);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

      {!isConnected ? (
        <div className="space-y-6">
          {isScanning ? (
            <div className="rounded-2xl overflow-hidden bg-black/50 aspect-square relative">
              <div id="reader" className="w-full h-full"></div>
              <button 
                onClick={() => {
                  if (scannerRef.current) scannerRef.current.stop();
                  setIsScanning(false);
                }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-full text-sm"
              >
                Cancel Scan
              </button>
            </div>
          ) : (
            <button
              onClick={startScanner}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Camera className="w-5 h-5" /> Scan QR Code
            </button>
          )}

          <div className="flex items-center gap-4 text-white/30 text-sm">
            <div className="flex-1 h-px bg-white/10"></div>
            OR
            <div className="flex-1 h-px bg-white/10"></div>
          </div>

          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="Enter 8-character code"
            className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-center tracking-widest font-mono text-lg"
            maxLength={8}
          />

          <button
            onClick={() => connectToPC()}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white border-none py-4 px-6 rounded-xl font-medium transition-all flex items-center justify-center gap-3 shadow-lg"
          >
            <LinkIcon className="w-5 h-5" />
            Connect
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="relative">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              accept="image/*,application/pdf"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white border-none py-6 px-6 rounded-xl font-medium transition-all flex flex-col items-center justify-center gap-3 shadow-lg">
              <Upload className="w-8 h-8" />
              <span>Choose Files (Images/PDFs)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-yellow-400/90 text-black p-4 rounded-xl font-bold flex items-center gap-3">
              <FileText className="w-5 h-5" />
              <span>Sent: {sentFiles}</span>
            </div>
            <div className="bg-yellow-400/90 text-black p-4 rounded-xl font-bold flex items-center gap-3">
              <Printer className="w-5 h-5" />
              <span>Prints: {printCount}</span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
