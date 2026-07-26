import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, RefreshCw, Star, Heart, Smile, Download, Trash2, Home, Camera as CameraIcon, Layout, Image as ImageIcon } from 'lucide-react';
import confetti from 'canvas-confetti';

// --- Types ---
type AppStep = 'HOME' | 'CAPTURE' | 'PREVIEW' | 'GALLERY';

interface SavedPhoto {
  id: string;
  url: string;
  timestamp: number;
}

// --- Constants ---
const FRAME_COLORS = [
  'bg-white',
  'bg-pink-100',
  'bg-sky-100',
  'bg-yellow-100',
  'bg-purple-100',
  'bg-rose-500',
  'bg-indigo-600',
];

// --- Helpers ---
const speak = (text: string) => {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ko-KR';
  utterance.rate = 1.2;
  window.speechSynthesis.speak(utterance);
};

export default function App() {
  const [step, setStep] = useState<AppStep>('HOME');
  const [captures, setCaptures] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [gallery, setGallery] = useState<SavedPhoto[]>([]);
  const [selectedFrame, setSelectedFrame] = useState(FRAME_COLORS[0]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load Gallery
  useEffect(() => {
    const saved = localStorage.getItem('kids-4cut-gallery');
    if (saved) {
      setGallery(JSON.parse(saved));
    }
  }, []);

  // Save Gallery
  const saveToGallery = (url: string) => {
    const newPhoto: SavedPhoto = {
      id: Date.now().toString(),
      url,
      timestamp: Date.now(),
    };
    const updated = [newPhoto, ...gallery];
    setGallery(prev => [newPhoto, ...prev]);
    localStorage.setItem('kids-4cut-gallery', JSON.stringify(updated));
  };

  const deleteFromGallery = (id: string) => {
    const updated = gallery.filter(p => p.id !== id);
    setGallery(updated);
    localStorage.setItem('kids-4cut-gallery', JSON.stringify(updated));
  };

  // Camera Logic
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera Error:', err);
      alert('카메라를 켤 수 없어요. 권한을 확인해주세요!');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const takePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg');
      }
    }
    return null;
  }, []);

  // Four-Cut Sequence
  const startCaptureSequence = async () => {
    setCaptures([]);
    setIsCapturing(true);
    speak('지금부터 사진을 네 번 찍을 거예요. 준비됐나요?');

    for (let i = 0; i < 4; i++) {
      for (let c = 3; c > 0; c--) {
        setCountdown(c);
        speak(c.toString());
        await new Promise(r => setTimeout(r, 1000));
      }
      setCountdown(null);
      speak('찰칵!');
      const img = takePhoto();
      if (img) setCaptures(prev => [...prev, img]);
      await new Promise(r => setTimeout(r, 500));
    }

    setIsCapturing(false);
    setStep('PREVIEW');
    speak('우와! 예쁜 사진들이 찍혔어요!');
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  // Final Composite Generation
  const generateFinalStrip = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 600;
    const height = 1800;
    const padding = 20;
    const photoGap = 15;
    const photoHeight = (height - (padding * 2) - (photoGap * 3) - 150) / 4;
    const photoWidth = width - (padding * 2);

    canvas.width = width;
    canvas.height = height;

    const colorMap: Record<string, string> = {
      'bg-white': '#FFFFFF',
      'bg-pink-100': '#fee2e2',
      'bg-sky-100': '#e0f2fe',
      'bg-yellow-100': '#fef9c3',
      'bg-purple-100': '#f3e8ff',
      'bg-rose-500': '#f43f5e',
      'bg-indigo-600': '#4f46e5',
    };
    
    ctx.fillStyle = colorMap[selectedFrame] || '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    let loaded = 0;
    captures.forEach((cap, i) => {
      const img = new Image();
      img.src = cap;
      img.onload = () => {
        const y = padding + (photoHeight + photoGap) * i;
        ctx.drawImage(img, padding, y, photoWidth, photoHeight);
        loaded++;
        
        if (loaded === 4) {
          ctx.fillStyle = selectedFrame === 'bg-rose-500' || selectedFrame === 'bg-indigo-600' ? 'white' : '#333';
          ctx.font = 'bold 40px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Kids 4-Cut', width / 2, height - 60);
          ctx.font = '24px sans-serif';
          ctx.fillText(new Date().toLocaleDateString(), width / 2, height - 25);
          
          const finalUrl = canvas.toDataURL('image/jpeg');
          saveToGallery(finalUrl);
          setStep('GALLERY');
        }
      };
    });
  };

  useEffect(() => {
    if (step === 'CAPTURE') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [step]);

  return (
    <div className="min-h-screen bg-[#FDFCF0] font-sans text-[#4A4A4A] overflow-hidden flex flex-col">
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Kiosk Header */}
      <header className="h-20 bg-white border-b-4 border-[#FFD93D] flex items-center justify-between px-10 shadow-sm shrink-0 z-50">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => setStep('HOME')}>
          <div className="w-12 h-12 bg-[#FF87B2] rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-pink-200 shadow-lg">📸</div>
          <h1 className="text-3xl font-black tracking-tight">키즈 네컷 <span className="text-[#FF87B2]">Photo Kiosk</span></h1>
        </div>
        
        {/* Progress Stepper */}
        <div className="hidden md:flex items-center gap-6">
          {[
            { id: 1, label: '준비', s: 'HOME' },
            { id: 2, label: '촬영', s: 'CAPTURE' },
            { id: 3, label: '꾸미기', s: 'PREVIEW' },
            { id: 4, label: '인쇄/저장', s: 'GALLERY' }
          ].map((item) => (
            <div key={item.id} className="flex items-center gap-6">
              <div className={`flex flex-col items-center ${step === item.s ? 'opacity-100' : 'opacity-30'}`}>
                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold transition-all ${step === item.s ? 'bg-[#FF87B2] text-white border-[#FF87B2] shadow-lg shadow-pink-100 scale-110' : 'border-gray-400'}`}>
                  {item.id}
                </div>
                <span className={`text-xs mt-1 font-black ${step === item.s ? 'text-[#FF87B2]' : 'text-gray-500'}`}>{item.label}</span>
              </div>
              {item.id < 4 && <div className={`w-8 h-[2px] ${['CAPTURE', 'PREVIEW', 'GALLERY'].includes(step) && item.id === 1 ? 'bg-[#FF87B2]' : (['PREVIEW', 'GALLERY'].includes(step) && item.id === 2 ? 'bg-[#FF87B2]' : (step === 'GALLERY' && item.id === 3 ? 'bg-[#FF87B2]' : 'bg-gray-200'))}`} />}
            </div>
          ))}
        </div>

        <button 
          onClick={() => speak('선생님이 곧 도와주러 오실 거예요. 조금만 기다려주세요!')}
          className="bg-[#4ADEDE] hover:bg-[#3bc7c7] text-white font-bold py-3 px-6 rounded-2xl flex items-center gap-2 transition-all shadow-lg active:translate-y-1"
        >
          <span className="text-xl font-bold">?</span> 도움 요청하기
        </button>
      </header>

      <main className="flex-1 flex p-8 gap-8 overflow-hidden">
        <AnimatePresence mode="wait">
          {step === 'HOME' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex-1 flex flex-col items-center justify-center text-center space-y-10"
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: [0, 3, -3, 0], scale: [1, 1.02, 1] }}
                  transition={{ repeat: Infinity, duration: 4 }}
                  className="w-56 h-56 bg-white rounded-[60px] flex items-center justify-center shadow-2xl relative z-10 border-8 border-white"
                >
                  <Smile size={120} className="text-[#FF87B2]" />
                </motion.div>
                <div className="absolute -top-6 -right-6 text-[#FFD93D] drop-shadow-xl"><Star size={60} fill="currentColor" /></div>
                <div className="absolute -bottom-6 -left-6 text-[#FF87B2] drop-shadow-xl"><Heart size={60} fill="currentColor" /></div>
              </div>
              
              <div className="space-y-4">
                <h1 className="text-6xl font-black text-[#4A4A4A] tracking-tighter">
                  추억을 <span className="text-[#FF87B2]">찰칵!</span>
                </h1>
                <p className="text-2xl text-gray-500 font-bold">우리들의 우정을 네 컷에 담아보아요</p>
              </div>

              <div className="flex flex-col gap-6 w-full max-w-sm">
                <button
                  onClick={() => setStep('CAPTURE')}
                  className="h-24 bg-[#FFD93D] hover:bg-[#f5cf35] rounded-[30px] shadow-[0_8px_0_0_#e5c12f] active:shadow-none active:translate-y-2 text-3xl font-black text-[#4A4A4A] flex items-center justify-center gap-4 transition-all"
                >
                  <span>시작하기</span>
                  <span className="text-4xl text-[#FF87B2]">📸</span>
                </button>
                <button
                  onClick={() => setStep('GALLERY')}
                  className="bg-white hover:bg-gray-50 text-[#4A4A4A] font-black py-4 px-10 rounded-2xl text-xl shadow-md border-b-4 border-gray-200 flex items-center justify-center gap-3 transition-all active:translate-y-1"
                >
                  <ImageIcon size={28} className="text-[#4ADEDE]" />
                  우리들 갤러리 보기
                </button>
              </div>
            </motion.div>
          )}

          {step === 'CAPTURE' && (
            <motion.div
              key="capture"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex gap-8 h-full"
            >
              {/* Camera Area */}
              <div className="flex-1 bg-white rounded-[40px] shadow-2xl border-8 border-white overflow-hidden relative group">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                
                <div className="absolute top-6 left-6 bg-[#FF87B2]/90 backdrop-blur-md text-white px-6 py-3 rounded-full font-black text-2xl shadow-xl">
                  {captures.length + 1} / 4 번째 촬영 중
                </div>

                <AnimatePresence>
                  {countdown !== null && (
                    <motion.div
                      key={countdown}
                      initial={{ scale: 3, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                      <span className="text-[20rem] font-black text-white drop-shadow-[0_15px_15px_rgba(0,0,0,0.5)]">
                        {countdown}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!isCapturing && captures.length === 0 && (
                  <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center">
                    <button
                      onClick={startCaptureSequence}
                      className="h-28 px-16 bg-[#FFD93D] hover:bg-[#f5cf35] rounded-[40px] shadow-[0_12px_0_0_#e5c12f] active:shadow-none active:translate-y-2 text-4xl font-black text-[#4A4A4A] flex items-center justify-center gap-6 transition-all animate-bounce"
                    >
                      <span>촬영 시작!</span>
                      <CameraIcon size={48} />
                    </button>
                  </div>
                )}
              </div>

              {/* Sidebar Preview */}
              <div className="w-64 flex flex-col gap-4">
                <div className="bg-white rounded-3xl p-5 shadow-inner border-2 border-white flex-1 flex flex-col gap-3">
                  <h3 className="text-lg font-black text-[#4A4A4A] mb-2">찍은 사진 🎞️</h3>
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex-1 bg-[#FDFCF0] rounded-2xl border-4 border-white shadow-sm overflow-hidden flex items-center justify-center relative">
                      {captures[i] ? (
                        <img src={captures[i]} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-gray-200">
                          <Star size={32} className={i === captures.length ? 'animate-pulse text-[#FFD93D]' : ''} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => setStep('HOME')}
                  className="bg-white text-gray-400 font-bold py-4 rounded-2xl shadow-sm border-b-4 border-gray-100 hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <Home size={20} /> 처음으로
                </button>
              </div>
            </motion.div>
          )}

          {step === 'PREVIEW' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex gap-10 h-full overflow-hidden"
            >
              {/* Photo Strip Area */}
              <div className="flex-1 bg-white rounded-[40px] shadow-2xl border-8 border-white flex justify-center items-center overflow-y-auto p-12">
                <div className={`w-[280px] ${selectedFrame} p-4 flex flex-col gap-3 shadow-2xl rounded-sm transition-colors duration-500 scale-110`}>
                  {captures.map((cap, i) => (
                    <div key={i} className="aspect-[4/3] bg-white rounded-sm overflow-hidden shadow-inner">
                      <img src={cap} className="w-full h-full object-cover" />
                    </div>
                  ))}
                  <div className={`mt-2 text-center font-black tracking-widest text-sm ${['bg-rose-500', 'bg-indigo-600'].includes(selectedFrame) ? 'text-white' : 'text-[#4A4A4A]'}`}>
                    KIDS 4-CUT ✨ {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.')}
                  </div>
                </div>
              </div>

              {/* Editing Controls Area */}
              <div className="w-[340px] flex flex-col gap-6">
                <div className="bg-white rounded-3xl p-6 shadow-md border-b-4 border-gray-100">
                  <h3 className="text-[#4A4A4A] font-black text-xl mb-6 flex items-center gap-2">🎨 테두리 색깔</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {FRAME_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setSelectedFrame(color)}
                        className={`w-full aspect-square rounded-full border-4 transition-all shadow-sm ${color} ${selectedFrame === color ? 'border-[#FFD93D] ring-4 ring-[#FFD93D]/20 scale-110' : 'border-white hover:scale-105'}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-md border-b-4 border-gray-100 flex-1">
                  <h3 className="text-[#4A4A4A] font-black text-xl mb-4 flex items-center gap-2">⭐ 친구 선물</h3>
                  <p className="text-gray-400 text-sm mb-4 font-bold">마음에 드는 사진이 완성됐나요?</p>
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => setStep('CAPTURE')}
                      className="w-full bg-gray-50 text-gray-500 font-bold py-4 rounded-2xl border-2 border-gray-100 flex items-center justify-center gap-2 hover:bg-gray-100"
                    >
                      <RefreshCw size={20} /> 사진 다시 찍기
                    </button>
                    <div className="pt-4 mt-auto">
                       <div className="text-4xl flex gap-4 animate-bounce justify-center">🎈 🌈 🍭 🐼</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={generateFinalStrip}
                  className="h-24 bg-[#FFD93D] hover:bg-[#f5cf35] rounded-[30px] shadow-[0_8px_0_0_#e5c12f] active:shadow-none active:translate-y-2 text-3xl font-black text-[#4A4A4A] flex items-center justify-center gap-4 transition-all"
                >
                  <span>사진 뽑기</span>
                  <span className="text-4xl">🖨️</span>
                </button>
              </div>
            </motion.div>
          )}

          {step === 'GALLERY' && (
            <motion.div
              key="gallery"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col space-y-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-4xl font-black text-[#4A4A4A]">우리들의 소중한 앨범 🎈</h2>
                <div className="flex gap-4">
                  <button onClick={() => setStep('CAPTURE')} className="px-8 bg-[#4ADEDE] hover:bg-[#3bc7c7] rounded-2xl shadow-lg shadow-cyan-100 text-white font-black py-4 flex items-center gap-3 transition-all active:scale-95">
                    <Camera size={24} /> 사진 더 찍기
                  </button>
                </div>
              </div>

              {gallery.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-6">
                  <div className="w-56 h-56 bg-white rounded-[50px] flex items-center justify-center shadow-xl border-8 border-white">
                    <ImageIcon size={100} className="text-gray-100" />
                  </div>
                  <p className="text-2xl font-black italic">아직 찍은 사진이 없어요!</p>
                  <button onClick={() => setStep('CAPTURE')} className="bg-[#FFD93D] text-[#4A4A4A] font-black px-12 py-5 rounded-3xl shadow-lg text-xl hover:scale-105 active:scale-95 transition-all">첫 사진 찍으러 가기</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 overflow-y-auto pb-24 pr-4 custom-scrollbar">
                  {gallery.map(photo => (
                    <motion.div
                      layout
                      key={photo.id}
                      className="bg-white p-4 rounded-[40px] shadow-2xl relative group border-4 border-white"
                    >
                      <img src={photo.url} className="w-full rounded-[25px] shadow-inner" alt="Saved" />
                      <div className="absolute top-8 right-8 flex flex-col gap-3 md:opacity-0 md:group-hover:opacity-100 transition-all">
                        <a
                          href={photo.url}
                          download={`kids-4cut-${photo.id}.jpg`}
                          className="bg-white/95 p-4 rounded-2xl shadow-2xl text-[#4ADEDE] hover:scale-110 active:scale-95 transition-all border-b-4 border-gray-100"
                        >
                          <Download size={28} />
                        </a>
                        <button
                          onClick={() => deleteFromGallery(photo.id)}
                          className="bg-white/95 p-4 rounded-2xl shadow-2xl text-[#FF5F5F] hover:scale-110 active:scale-95 transition-all border-b-4 border-gray-100"
                        >
                          <Trash2 size={28} />
                        </button>
                      </div>
                      <div className="mt-4 text-center">
                        <span className="text-xs font-black text-gray-300 uppercase tracking-widest">Saved At {new Date(photo.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="h-14 bg-[#FF87B2] flex items-center justify-center z-50 shrink-0">
        <p className="text-white font-black text-lg tracking-wide">
          {step === 'HOME' && "아래 노란색 '시작하기' 버튼을 눌러주세요!"}
          {step === 'CAPTURE' && "카메라를 보고 멋진 포즈를 지어주세요! (4번 찍어요)"}
          {step === 'PREVIEW' && "마음에 드는 배경색을 고르고 노란 버튼을 눌러주세요!"}
          {step === 'GALLERY' && "사진을 내려받거나 삭제할 수 있는 우리들의 기록장이에요."}
        </p>
      </footer>
    </div>
  );
}
