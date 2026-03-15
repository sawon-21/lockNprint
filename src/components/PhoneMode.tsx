import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Info, Link as LinkIcon, Upload, FileText, Printer, Camera, CheckCircle, Smartphone, AlertTriangle, Send } from 'lucide-react';
import { AppMode } from '../App';
import Peer, { DataConnection } from 'peerjs';
import type { Html5Qrcode } from 'html5-qrcode';
import { ref, get } from 'firebase/database';
import { db } from '../lib/firebase';

interface PhoneModeProps {
  setMode: (mode: AppMode) => void;
}

interface SelectedFile {
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending' | 'sending' | 'sent' | 'error';
}

export function PhoneMode({ setMode }: PhoneModeProps) {
  const [roomCode, setRoomCode] = useState('');
  const [status, setStatus] = useState('Awaiting auth code or QR scan...');
  const [isConnected, setIsConnected] = useState(false);
  const [sentFilesCount, setSentFilesCount] = useState(0);
  const [printCount, setPrintCount] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [errorLog, setErrorLog] = useState<string | null>(null);
  
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const peer = new Peer();
    peerRef.current = peer;

    peer.on('error', (err) => {
      console.error(err);
      setStatus('Uplink connection error.');
    });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
      peer.destroy();
      selectedFiles.forEach(f => URL.revokeObjectURL(f.previewUrl));
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
            setErrorLog('Invalid QR code format.');
          }
        },
        (errorMessage) => {
          // ignore parse errors
        }
      );
    } catch (err) {
      console.error(err);
      setErrorLog('Camera access denied or unavailable.');
      setIsScanning(false);
    }
  };

  const connectToPC = async (codeToUse?: string) => {
    const code = (codeToUse || roomCode).toUpperCase();
    if (code.length !== 8) {
      setErrorLog('Invalid auth code. Must be 8 characters.');
      return;
    }

    setStatus('Attempting connection to host...');
    setErrorLog(null);
    
    try {
      const snapshot = await get(ref(db, `rooms/${code}/host`));
      if (!snapshot.exists()) {
        setErrorLog('Host terminal not found or offline.');
        setStatus('Awaiting auth code or QR scan...');
        return;
      }

      setStatus('Negotiating secure uplink...');

      if (peerRef.current) {
        const conn = peerRef.current.connect(`locknprint-${code}`, {
          reliable: true
        });
        
        connRef.current = conn;

        conn.on('open', () => {
          setIsConnected(true);
          setStatus('Uplink established. Ready to transmit.');
        });

        conn.on('data', (data: any) => {
          if (data.type === 'printed') {
            setPrintCount(prev => prev + 1);
            setStatus(`Host confirmed print for file ID: ${data.id.substring(0,4)}...`);
            setTimeout(() => setStatus('Uplink established. Ready to transmit.'), 3000);
          }
        });

        conn.on('close', () => {
          setIsConnected(false);
          setStatus('Uplink disconnected by host.');
        });
      }
    } catch (err) {
      console.error(err);
      setErrorLog('Connection negotiation failed.');
      setStatus('Awaiting auth code or QR scan...');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: SelectedFile[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'pending'
    }));

    setSelectedFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendFile = async (selectedFile: SelectedFile) => {
    if (!connRef.current) return;
    
    if (selectedFile.file.size > 10 * 1024 * 1024) {
      setErrorLog(`File ${selectedFile.file.name} exceeds 10MB limit.`);
      setSelectedFiles(prev => prev.map(f => f.id === selectedFile.id ? { ...f, status: 'error' } : f));
      return;
    }

    setSelectedFiles(prev => prev.map(f => f.id === selectedFile.id ? { ...f, status: 'sending' } : f));

    try {
      const arrayBuffer = await selectedFile.file.arrayBuffer();
      connRef.current.send({
        type: 'file',
        id: selectedFile.id,
        name: selectedFile.file.name,
        fileType: selectedFile.file.type,
        data: arrayBuffer
      });
      
      setSelectedFiles(prev => prev.map(f => f.id === selectedFile.id ? { ...f, status: 'sent' } : f));
      setSentFilesCount(prev => prev + 1);
    } catch (err) {
      console.error('Failed to send file', err);
      setErrorLog(`Transmission failed for ${selectedFile.file.name}`);
      setSelectedFiles(prev => prev.map(f => f.id === selectedFile.id ? { ...f, status: 'error' } : f));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-zinc-900/80 border border-zinc-800 rounded-3xl backdrop-blur-xl p-8 shadow-[0_0_40px_rgba(16,185,129,0.05)]"
    >
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setMode('home')}
          className="text-zinc-500 hover:text-zinc-300 flex items-center gap-2 transition-colors font-mono text-sm uppercase"
        >
          <ArrowLeft className="w-4 h-4" /> Abort
        </button>
        <div className="flex items-center gap-2 text-emerald-500 font-mono text-xs uppercase tracking-widest">
          <Smartphone className="w-4 h-4" /> Mobile Uplink
        </div>
      </div>

      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 mb-6 font-mono text-xs">
        <div className="flex items-center gap-2 text-zinc-400 mb-2">
          <Info className="w-4 h-4" />
          <span>System Status:</span>
        </div>
        <div className={`text-sm ${isConnected ? 'text-emerald-400' : 'text-yellow-400'}`}>
          &gt; {status}
        </div>
        {errorLog && (
          <div className="mt-2 text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            &gt; {errorLog}
          </div>
        )}
      </div>

      {!isConnected ? (
        <div className="space-y-6">
          {isScanning ? (
            <div className="rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 aspect-square relative">
              <div id="reader" className="w-full h-full"></div>
              <button 
                onClick={() => {
                  if (scannerRef.current) scannerRef.current.stop();
                  setIsScanning(false);
                }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 text-zinc-300 px-6 py-2 rounded-xl text-sm font-mono uppercase hover:bg-zinc-800 transition-colors"
              >
                Cancel Scan
              </button>
            </div>
          ) : (
            <button
              onClick={startScanner}
              className="w-full bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 py-4 rounded-xl flex items-center justify-center gap-3 transition-colors font-mono text-sm uppercase"
            >
              <Camera className="w-5 h-5 text-emerald-500" /> Scan QR Code
            </button>
          )}

          <div className="flex items-center gap-4 text-zinc-600 font-mono text-xs uppercase">
            <div className="flex-1 h-px bg-zinc-800"></div>
            MANUAL OVERRIDE
            <div className="flex-1 h-px bg-zinc-800"></div>
          </div>

          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="ENTER 8-CHAR CODE"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-4 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all text-center tracking-widest font-mono text-lg uppercase"
            maxLength={8}
          />

          <button
            onClick={() => connectToPC()}
            className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 py-4 px-6 rounded-xl font-mono text-sm uppercase transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
          >
            <LinkIcon className="w-5 h-5" />
            Establish Uplink
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-950 border border-zinc-800 text-zinc-300 p-4 rounded-xl font-mono text-sm flex items-center gap-3">
              <FileText className="w-5 h-5 text-emerald-500" />
              <span>Sent: {sentFilesCount}</span>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 text-zinc-300 p-4 rounded-xl font-mono text-sm flex items-center gap-3">
              <Printer className="w-5 h-5 text-cyan-500" />
              <span>Printed: {printCount}</span>
            </div>
          </div>

          <div className="relative">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              accept="image/*,application/pdf"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="w-full bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 border-dashed hover:border-emerald-500/50 text-zinc-400 py-8 px-6 rounded-xl transition-all flex flex-col items-center justify-center gap-3">
              <Upload className="w-8 h-8 text-emerald-500 mb-2" />
              <span className="font-mono text-sm uppercase tracking-wider text-zinc-300">Select Files</span>
              <span className="font-mono text-xs text-zinc-500">Images or PDFs (Max 10MB)</span>
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <div className="max-h-80 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {selectedFiles.map(f => (
                <div key={f.id} className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm font-mono text-zinc-300 truncate pr-4">
                      <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="truncate">{f.file.name}</span>
                    </div>
                    {f.status === 'sent' && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
                    {f.status === 'error' && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
                  </div>
                  
                  <div className="relative rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800">
                    {f.file.type.startsWith('image/') ? (
                      <img src={f.previewUrl} alt={f.file.name} className="w-full h-auto max-h-40 object-contain" />
                    ) : (
                      <iframe src={f.previewUrl} className="w-full h-40 bg-zinc-100" title={f.file.name} />
                    )}
                  </div>

                  {f.status !== 'sent' && (
                    <button
                      onClick={() => sendFile(f)}
                      disabled={f.status === 'sending'}
                      className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed text-emerald-400 py-3 rounded-lg font-mono text-sm uppercase transition-all flex items-center justify-center gap-2"
                    >
                      {f.status === 'sending' ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-emerald-500"></div>
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {f.status === 'sending' ? 'TRANSMITTING...' : 'TRANSMIT FILE'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
