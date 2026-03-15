import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Copy, Info, FileText, Printer, CheckCircle, AlertTriangle, Terminal, Trash2, ChevronUp, ChevronDown, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [status, setStatus] = useState('Initializing secure terminal...');
  const [isConnected, setIsConnected] = useState(false);
  const [files, setFiles] = useState<ReceivedFile[]>([]);
  const [printCount, setPrintCount] = useState(0);
  const [printProgress, setPrintProgress] = useState<Record<string, string>>({});
  const [errorLog, setErrorLog] = useState<string | null>(null);
  const [imageZooms, setImageZooms] = useState<Record<string, number>>({});
  const [pdfPages, setPdfPages] = useState<Record<string, number>>({});
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);

  useEffect(() => {
    const peer = new Peer(`locknprint-${roomCode}`);
    peerRef.current = peer;

    peer.on('open', (id) => {
      setStatus('Awaiting uplink connection...');
      set(ref(db, `rooms/${roomCode}`), {
        host: true,
        timestamp: Date.now()
      });
    });

    peer.on('connection', (conn) => {
      connRef.current = conn;
      setIsConnected(true);
      setStatus('Uplink established. Ready to receive.');
      setErrorLog(null);

      conn.on('data', (data: any) => {
        if (data.type === 'file') {
          if (!data.fileType.startsWith('image/') && data.fileType !== 'application/pdf') {
            setErrorLog(`SECURITY ALERT: Blocked unsupported file type (${data.name})`);
            setTimeout(() => setErrorLog(null), 5000);
            return;
          }
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
        setStatus('Uplink disconnected.');
      });
    });

    peer.on('error', (err) => {
      console.error(err);
      setStatus('Terminal connection error.');
    });

    return () => {
      remove(ref(db, `rooms/${roomCode}`));
      peer.destroy();
      files.forEach(f => URL.revokeObjectURL(f.data));
    };
  }, [roomCode]);

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setStatus('Auth code copied to clipboard.');
    setTimeout(() => {
      setStatus(isConnected ? 'Uplink established. Ready to receive.' : 'Awaiting uplink connection...');
    }, 2000);
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    setFiles(prev => {
      const newFiles = [...prev];
      if (direction === 'up' && index > 0) {
        [newFiles[index - 1], newFiles[index]] = [newFiles[index], newFiles[index - 1]];
      } else if (direction === 'down' && index < newFiles.length - 1) {
        [newFiles[index + 1], newFiles[index]] = [newFiles[index], newFiles[index + 1]];
      }
      return newFiles;
    });
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file) URL.revokeObjectURL(file.data);
      return prev.filter(f => f.id !== id);
    });
  };

  const handleZoom = (id: string, direction: 'in' | 'out') => {
    setImageZooms(prev => {
      const current = prev[id] || 1;
      const newZoom = direction === 'in' ? current + 0.25 : Math.max(0.25, current - 0.25);
      return { ...prev, [id]: newZoom };
    });
  };

  const handlePdfPage = (id: string, delta: number) => {
    setPdfPages(prev => {
      const current = prev[id] || 1;
      const newPage = Math.max(1, current + delta);
      return { ...prev, [id]: newPage };
    });
  };

  const handlePrintFile = async (file: ReceivedFile) => {
    setPrintProgress(prev => ({ ...prev, [file.id]: 'Processing...' }));

    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      if (file.type.startsWith('image/')) {
        setPrintProgress(prev => ({ ...prev, [file.id]: 'Processing...' }));
        const img = new Image();
        img.src = file.data;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const MAX_DIM = 2500;
              let width = img.naturalWidth;
              let height = img.naturalHeight;
              if (width > MAX_DIM || height > MAX_DIM) {
                const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
                width *= ratio;
                height *= ratio;
              }
              canvas.width = width;
              canvas.height = height;
              
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, width, height);
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              
              ctx.drawImage(img, 0, 0, width, height);
              const imgData = canvas.toDataURL('image/jpeg', 0.85);
              const maxWidth = 190;
              const printRatio = height / width;
              const printHeight = maxWidth * printRatio;
              doc.addImage(imgData, 'JPEG', 10, 10, maxWidth, printHeight);
            }
            resolve();
          };
          img.onerror = reject;
        });
      } else if (file.type === 'application/pdf') {
        setPrintProgress(prev => ({ ...prev, [file.id]: 'Processing...' }));
        doc.text(`PDF Document: ${file.name} (Open separately to print)`, 10, 20);
      }

      setPrintProgress(prev => ({ ...prev, [file.id]: 'Printing...' }));
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = url;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setPrintProgress(prev => ({ ...prev, [file.id]: 'Done' }));
            
            setTimeout(() => {
              document.body.removeChild(iframe);
              URL.revokeObjectURL(url);
              setPrintCount(prev => prev + 1);
              setFiles(prev => prev.filter(f => f.id !== file.id));
              URL.revokeObjectURL(file.data);
              if (connRef.current) {
                connRef.current.send({ type: 'printed', id: file.id });
              }
              setPrintProgress(prev => { const newP = {...prev}; delete newP[file.id]; return newP; });
            }, 1000);
          } catch (e) {
            console.error(e);
            setErrorLog('Print failed. Browser might be blocking iframe printing.');
            setPrintProgress(prev => { const newP = {...prev}; delete newP[file.id]; return newP; });
            document.body.removeChild(iframe);
            URL.revokeObjectURL(url);
          }
        }, 500);
      };

    } catch (err) {
      console.error(err);
      setErrorLog(`Print failed for ${file.name}`);
      setPrintProgress(prev => { const newP = {...prev}; delete newP[file.id]; return newP; });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-zinc-900/80 border border-zinc-800 rounded-3xl backdrop-blur-xl p-8 shadow-[0_0_40px_rgba(6,182,212,0.05)]"
    >
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setMode('home')}
          className="text-zinc-500 hover:text-zinc-300 flex items-center gap-2 transition-colors font-mono text-sm uppercase"
        >
          <ArrowLeft className="w-4 h-4" /> Abort
        </button>
        <div className="flex items-center gap-2 text-cyan-500 font-mono text-xs uppercase tracking-widest">
          <Terminal className="w-4 h-4" /> Host Terminal
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

      <div className="text-center mb-8">
        <h5 className="text-zinc-500 font-mono text-xs uppercase tracking-widest mb-3">Auth Code</h5>
        <div className="flex items-center justify-center gap-4">
          <div className="text-4xl tracking-widest font-mono bg-zinc-950 border border-zinc-800 px-6 py-3 rounded-xl text-zinc-100 shadow-inner">
            {roomCode}
          </div>
          <button
            onClick={copyCode}
            className="text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800 transition-all p-3 rounded-xl border border-transparent hover:border-zinc-700"
          >
            <Copy className="w-6 h-6" />
          </button>
        </div>
      </div>

      {!isConnected && (
        <div className="flex justify-center mb-8 bg-zinc-950 p-4 rounded-2xl w-fit mx-auto border border-zinc-800">
          <QRCodeSVG value={roomCode} size={180} bgColor="transparent" fgColor="#f4f4f5" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-zinc-950 border border-zinc-800 text-zinc-300 p-4 rounded-xl font-mono text-sm flex items-center gap-3">
          <FileText className="w-5 h-5 text-cyan-500" />
          <span>Queue: {files.length}</span>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 text-zinc-300 p-4 rounded-xl font-mono text-sm flex items-center gap-3">
          <Printer className="w-5 h-5 text-emerald-500" />
          <span>Printed: {printCount}</span>
        </div>
      </div>

      {files.length > 0 && (
        <div className="max-h-96 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          {files.map((f, index) => (
            <div key={f.id} className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm font-mono text-zinc-300 truncate pr-4">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="truncate">{f.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => moveFile(index, 'up')} disabled={index === 0} className="p-1 text-zinc-500 hover:text-cyan-400 disabled:opacity-30 disabled:hover:text-zinc-500 transition-colors">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button onClick={() => moveFile(index, 'down')} disabled={index === files.length - 1} className="p-1 text-zinc-500 hover:text-cyan-400 disabled:opacity-30 disabled:hover:text-zinc-500 transition-colors">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button onClick={() => removeFile(f.id)} className="p-1 text-zinc-500 hover:text-red-400 transition-colors ml-2">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="relative rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 flex flex-col">
                {f.type.startsWith('image/') ? (
                  <>
                    <div className="absolute top-2 right-2 z-10 flex gap-1 bg-zinc-950/80 p-1 rounded-lg backdrop-blur-sm border border-zinc-800">
                      <button onClick={() => handleZoom(f.id, 'out')} className="p-1 text-zinc-400 hover:text-emerald-400 transition-colors"><ZoomOut className="w-4 h-4" /></button>
                      <div className="w-12 text-center text-xs text-zinc-300 font-mono flex items-center justify-center">{Math.round((imageZooms[f.id] || 1) * 100)}%</div>
                      <button onClick={() => handleZoom(f.id, 'in')} className="p-1 text-zinc-400 hover:text-emerald-400 transition-colors"><ZoomIn className="w-4 h-4" /></button>
                    </div>
                    <div className="overflow-auto h-64 custom-scrollbar flex justify-center items-center bg-zinc-900/50">
                      <img 
                        src={f.data} 
                        alt={f.name} 
                        style={{ transform: `scale(${imageZooms[f.id] || 1})`, transformOrigin: 'center' }} 
                        className="transition-transform duration-200 ease-out max-w-full h-auto object-contain" 
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="absolute top-2 right-2 z-10 flex gap-1 bg-zinc-950/80 p-1 rounded-lg backdrop-blur-sm border border-zinc-800">
                      <button onClick={() => handlePdfPage(f.id, -1)} className="p-1 text-zinc-400 hover:text-cyan-400 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                      <div className="w-16 text-center text-xs text-zinc-300 font-mono flex items-center justify-center">Pg {pdfPages[f.id] || 1}</div>
                      <button onClick={() => handlePdfPage(f.id, 1)} className="p-1 text-zinc-400 hover:text-cyan-400 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                    <iframe src={`${f.data}#page=${pdfPages[f.id] || 1}`} className="w-full h-64 bg-zinc-100" title={f.name} />
                  </>
                )}
              </div>

              <button
                onClick={() => handlePrintFile(f)}
                disabled={!!printProgress[f.id]}
                className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed text-cyan-400 py-3 rounded-lg font-mono text-sm transition-all flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                {printProgress[f.id] || 'PRINT FILE'}
              </button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
