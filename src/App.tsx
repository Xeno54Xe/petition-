import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, ShieldAlert, PenTool, Wind, Droplets, 
  Activity, ArrowRight, Lock, User, Terminal, CheckCircle2,
  Globe, Fingerprint, Cpu, Loader2
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot } from 'firebase/firestore';

// ==========================================
// ENVIRONMENT DECLARATIONS (To keep TypeScript happy)
// ==========================================
declare const __firebase_config: string | undefined;
declare const __initial_auth_token: string | undefined;
declare const __app_id: string | undefined;

// ==========================================
// FIREBASE INITIALIZATION (SAFE WRAPPER)
// ==========================================
const firebaseConfig = typeof __firebase_config !== 'undefined' && __firebase_config 
  ? JSON.parse(__firebase_config) 
  : { apiKey: "demo-key", projectId: "demo-project", appId: "1:123:web:123" };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'metro-petition-app';

// ==========================================
// CUSTOM SIGNATURE PAD COMPONENT
// ==========================================
interface SignaturePadProps {
  onSign: (data: string | null) => void;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onSign }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#a855f7'; // Premium neon purple
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Fix for high DPI displays (Retina)
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      }
    }
  }, []);

  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
      if (!hasContent) setHasContent(true);
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (canvas) {
        onSign(canvas.toDataURL());
      }
    }
  };

  const clearPad = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasContent(false);
      onSign(null);
    }
  };

  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/30 to-blue-500/30 rounded-xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
      <div className="relative bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden">
        <div className="flex justify-between items-center px-4 py-2 border-b border-white/5 bg-white/[0.02]">
          <span className="text-[10px] text-gray-400 uppercase tracking-widest font-medium flex items-center gap-2">
            <Fingerprint className="w-3 h-3 text-purple-400" /> Authorization Canvas
          </span>
          <button type="button" onClick={clearPad} className="text-[10px] text-gray-500 hover:text-white transition-colors uppercase tracking-wider">
            Reset
          </button>
        </div>
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-[160px] cursor-crosshair touch-none"
        />
        {!hasContent && (
          <div className="absolute inset-0 top-10 flex items-center justify-center pointer-events-none">
            <p className="text-white/20 text-sm font-medium">Draw signature here...</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// MAIN APPLICATION ENGINE
// ==========================================
interface SignatureData {
  id: string;
  userId: string;
  name: string;
  line: string;
  timestamp: number;
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authStep, setAuthStep] = useState<'initializing' | 'login' | 'dashboard'>('initializing');
  const [profile, setProfile] = useState({ name: '', line: 'yellow' });
  
  // Database States
  const [signatures, setSignatures] = useState<SignatureData[]>([]);
  const [hasSigned, setHasSigned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  // 1. Initialize Firebase Auth STRICTLY on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.warn("Running in Local Demo Mode (Firebase not connected yet).");
        setTimeout(() => setAuthStep('login'), 800);
      }
    };
    initAuth();

    let unsubscribe = () => {};
    try {
      unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        // Use real user or fallback to a demo user
        setUser(currentUser || { uid: 'local-demo-user' } as FirebaseUser);
        if (authStep === 'initializing') {
          setTimeout(() => setAuthStep('login'), 800); 
        }
      });
    } catch (err) {
      if (authStep === 'initializing') {
        setTimeout(() => setAuthStep('login'), 800);
      }
    }
    return () => unsubscribe();
  }, [authStep]);

  // 2. Fetch Live Signatures from Firestore
  useEffect(() => {
    if (!user || authStep !== 'dashboard') return;

    try {
      const sigsRef = collection(db, 'artifacts', appId, 'public', 'data', 'signatures');
      const unsubscribe = onSnapshot(sigsRef, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SignatureData));
        data.sort((a, b) => b.timestamp - a.timestamp);
        
        setSignatures(data);
        if (data.some(s => s.userId === user.uid)) {
          setHasSigned(true);
        }
      }, (error) => {
        console.error("Firestore Error:", error);
      });

      return () => unsubscribe();
    } catch (err) {
      console.warn("Firestore not connected. Running local state only.");
    }
  }, [user, authStep]);

  // 3. Submit Petition Logic
  const handleSignPetition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !signatureData) return;
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'signatures'), {
        userId: user.uid,
        name: profile.name,
        line: profile.line,
        timestamp: Date.now(),
      });
      setHasSigned(true);
    } catch (err) {
      console.error("Database missing. Mocking success locally:", err);
      // Demo Mode: Add signature to local state so the UI still works!
      setSignatures(prev => [{
        id: Math.random().toString(),
        userId: user.uid,
        name: profile.name,
        line: profile.line,
        timestamp: Date.now()
      }, ...prev]);
      setHasSigned(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // VIEW: INITIALIZING SCREEN
  // ==========================================
  if (authStep === 'initializing') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Cpu className="w-12 h-12 text-purple-500 animate-pulse" />
          <div className="text-sm font-mono tracking-widest text-gray-400 uppercase">Connecting to Secure Network</div>
        </motion.div>
      </div>
    );
  }

  // ==========================================
  // VIEW: AUTHENTICATION / LOGIN GATE
  // ==========================================
  if (authStep === 'login') {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center p-6 relative overflow-hidden font-sans">
        {/* Background Ambience */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="w-full max-w-md bg-white/[0.02] border border-white/10 rounded-3xl p-8 backdrop-blur-2xl shadow-2xl relative z-10"
        >
          <div className="flex justify-center mb-8">
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
              <Lock className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-white tracking-tight">Identity Verification</h1>
            <p className="text-sm text-gray-400 mt-2">DMRC Directive 404 access requires a verified aesthetic profile.</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); setAuthStep('dashboard'); }} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest pl-1">Alias / Legal Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  required 
                  type="text" 
                  value={profile.name}
                  onChange={(e) => setProfile({...profile, name: e.target.value})}
                  placeholder="e.g. Rahul Sharma" 
                  className="w-full bg-black/50 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest pl-1">Primary Transit Vector</label>
              <div className="relative">
                <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <select 
                  required 
                  value={profile.line}
                  onChange={(e) => setProfile({...profile, line: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white appearance-none focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                >
                  <option value="yellow">Yellow Line (High Density Threat)</option>
                  <option value="blue">Blue Line (Endurance Threat)</option>
                  <option value="pink">Pink Line (Deceptive Calm)</option>
                  <option value="magenta">Magenta Line (Structural Risk)</option>
                </select>
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full mt-4 bg-white text-black font-semibold text-sm py-4 rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2 group"
            >
              Authenticate & Enter
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
          
          <div className="mt-8 text-center flex items-center justify-center gap-2 text-[10px] text-gray-600 font-mono">
            <Globe className="w-3 h-3" /> End-to-end encrypted connection
          </div>
        </motion.div>
      </div>
    );
  }

  // ==========================================
  // VIEW: MAIN PLATFORM DASHBOARD
  // ==========================================
  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 font-sans selection:bg-purple-500/30 selection:text-white pb-32">
      
      {/* Premium Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-white tracking-tight">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            DMRC-404
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500 hidden md:inline-block">Logged in as</span>
            <span className="bg-white/10 px-3 py-1 rounded-full border border-white/10 font-medium">{profile.name}</span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 px-6 overflow-hidden flex flex-col items-center text-center">
        <div className="absolute top-0 w-full h-[500px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-[#050505] to-[#050505] pointer-events-none" />
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 px-4 py-1.5 rounded-full text-[10px] font-bold text-purple-400 tracking-[0.2em] uppercase mb-8">
            <Sparkles className="w-3.5 h-3.5" /> High-Priority Legislative Petition
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500 mb-6 leading-tight">
            Dignity In Transit. <br/>
            <span className="italic font-serif font-medium text-gray-400">Not just a commute.</span>
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-base md:text-lg font-light leading-relaxed">
            Standard seating models are fundamentally flawed. They fail to calculate the devastating friction of vinyl seats on premium tailored linens and ₹4000 styling clay. It's time to mandate designated aesthetic protection zones.
          </p>
        </motion.div>
      </div>

      {/* Dashboard Grid */}
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* Left Column: Data & Stats (Span 7) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Manifesto Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <ShieldAlert className="w-48 h-48 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-6">The Rajiv Chowk Incident</h2>
            <div className="space-y-4 text-gray-400 text-sm leading-relaxed max-w-xl">
              <p>Predictive models show the probability of surviving a Yellow Line transfer with an uncreased overshirt is currently sitting at <strong>0.04%</strong>.</p>
              <p>Every morning, perfectly styled individuals board the train, defending their personal space like a goalkeeper facing a penalty. Ambient humidity destroys hair volume, and rapid deceleration wrinkles fabric beyond repair.</p>
              <div className="pl-4 border-l-2 border-purple-500 text-gray-300 italic font-medium my-6">
                "I shouldn't have to choose between reaching my destination on time and maintaining my aesthetic integrity."
              </div>
            </div>
          </motion.div>

          {/* Stats Bento */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="bg-[#0a0a0a] border border-white/5 p-6 rounded-3xl">
              <Wind className="w-6 h-6 text-blue-400 mb-4" />
              <div className="text-3xl font-bold text-white mb-1">94%</div>
              <p className="text-xs text-gray-500 leading-snug">Correlation between commutes & hair volume deflation.</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="bg-[#0a0a0a] border border-white/5 p-6 rounded-3xl">
              <Droplets className="w-6 h-6 text-purple-400 mb-4" />
              <div className="text-3xl font-bold text-white mb-1">₹12k</div>
              <p className="text-xs text-gray-500 leading-snug">Avg. monthly loss in ruined skincare layers per capita.</p>
            </motion.div>
          </div>
        </div>

        {/* Right Column: Signature App & Feed (Span 5) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Action Module */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="bg-gradient-to-br from-[#121212] to-[#050505] border border-purple-500/20 rounded-3xl p-6 shadow-[0_0_40px_-15px_rgba(168,85,247,0.2)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <PenTool className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Endorse Movement</h3>
            </div>

            {hasSigned ? (
              <div className="py-8 flex flex-col items-center text-center space-y-4">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </motion.div>
                <div>
                  <h4 className="text-white font-bold text-lg">Signature Verified</h4>
                  <p className="text-xs text-gray-400 mt-1">Your aesthetic rights have been logged on the cloud.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSignPetition} className="space-y-6">
                <SignaturePad onSign={(data) => setSignatureData(data)} />
                <button 
                  type="submit" 
                  disabled={!signatureData || isSubmitting}
                  className={`w-full py-4 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                    signatureData 
                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20' 
                    : 'bg-white/5 text-gray-600 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cryptographically Sign Petition'}
                </button>
              </form>
            )}
          </motion.div>

          {/* Live Signatures Feed */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 flex flex-col h-[300px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Live Ledger</h3>
              <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-wider font-mono">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                {signatures.length} Entries
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              <AnimatePresence>
                {signatures.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-600 text-sm">
                    No signatures yet. Be the first.
                  </div>
                ) : (
                  signatures.map((sig) => (
                    <motion.div 
                      key={sig.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white/[0.02] border border-white/5 p-3 rounded-xl flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center text-xs font-bold text-gray-300">
                        {sig.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="text-sm font-medium text-gray-200 truncate">{sig.name}</div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest truncate">{sig.line} line survivor</div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}