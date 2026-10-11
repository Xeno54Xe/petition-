import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, ShieldAlert, PenTool, Wind, Droplets, 
  ArrowRight, Terminal, CheckCircle2,
  Globe, Fingerprint, Cpu, Loader2, MapPin, AlertTriangle, Activity
} from 'lucide-react';

// ==========================================
// FIREBASE BACKEND CONFIGURATION
// ==========================================
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

// ⚠️ PASTE YOUR FIREBASE KEYS HERE:
const firebaseConfig = {
  apiKey: "AIzaSyDxRo-PDRRnf9hBrxDZVYSOaMN46tnDXxs",
  authDomain: "petito-a979c.firebaseapp.com",
  projectId: "petito-a979c",
  storageBucket: "petito-a979c.firebasestorage.app",
  messagingSenderId: "44134449783",
  appId: "1:44134449783:web:33d534791d5e32d1f3fc72",
  measurementId: "G-47K74HLS05"
};

// Safety Check: If keys are missing, we fallback to Local Simulation so the app doesn't crash.
const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY";

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
const auth = isFirebaseConfigured ? getAuth(app!) : null;
const db = isFirebaseConfigured ? getFirestore(app!) : null;
const googleProvider = isFirebaseConfigured ? new GoogleAuthProvider() : null;

// ==========================================
// NATIONAL TRANSIT DATA MATRIX
// ==========================================
const METRO_ZONES = {
  delhi: {
    name: "Delhi NCR",
    lines: [
      { id: "yellow", name: "Yellow Line (High Density Threat)" },
      { id: "blue", name: "Blue Line (Endurance Threat)" },
      { id: "pink", name: "Pink Line (Deceptive Calm)" },
      { id: "magenta", name: "Magenta Line (Structural Risk)" }
    ]
  },
  mumbai: {
    name: "Mumbai MMR",
    lines: [
      { id: "western_local", name: "Western Local (Sardine Simulator)" },
      { id: "central_local", name: "Central Local (Sweatbox Extreme)" },
      { id: "metro_1", name: "Metro Line 1 (Ghatkopar Gridlock)" },
      { id: "metro_2a", name: "Metro Line 2A (The Andheri Crawl)" }
    ]
  },
  bengaluru: {
    name: "Bengaluru Namma Metro",
    lines: [
      { id: "purple", name: "Purple Line (Tech-Bro Gridlock)" },
      { id: "green", name: "Green Line (The Endless Wait)" }
    ]
  },
  kolkata: {
    name: "Kolkata Metro",
    lines: [
      { id: "blue_vintage", name: "Blue Line (Vintage Humidity)" },
      { id: "green_underwater", name: "Green Line (The Underwater Flex)" }
    ]
  }
};

const THREAT_UPDATES = [
  "⚠️ ALERT: Unprecedented humidity detected on Mumbai Western Local. Linen shirts at critical risk.",
  "📉 UPDATE: Bengaluru Purple Line gridlock currently costing ₹12,000/hr in evaporated skincare.",
  "🚨 CRITICAL: Delhi Yellow Line AC failure reported. Initiating emergency aesthetic protocols.",
  "⚠️ WARNING: Kolkata Green Line experiencing severe pomade destabilization vectors."
];

type CityKey = keyof typeof METRO_ZONES;

interface SignatureData {
  id: string;
  name: string;
  city: string;
  line: string;
  timestamp: number;
}

// ==========================================
// CUSTOM SIGNATURE PAD
// ==========================================
const SignaturePad: React.FC<{ onSign: (data: string | null) => void }> = ({ onSign }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
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
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) { ctx.beginPath(); ctx.moveTo(x, y); }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) { ctx.lineTo(x, y); ctx.stroke(); if (!hasContent) setHasContent(true); }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      if (canvasRef.current) onSign(canvasRef.current.toDataURL());
    }
  };

  const clearPad = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
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
          <button type="button" onClick={clearPad} className="text-[10px] text-gray-500 hover:text-white transition-colors uppercase tracking-wider">Reset</button>
        </div>
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseOut={stopDrawing}
          onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
          width={400} height={160}
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
// MAIN APPLICATION
// ==========================================
export default function App() {
  const [appState, setAppState] = useState<'initializing' | 'landing' | 'authenticating' | 'dashboard'>('initializing');
  const [user, setUser] = useState<any>(null); // Stores Google User Data
  const [profile, setProfile] = useState({ city: 'delhi' as CityKey, line: 'yellow' });
  
  const [signatures, setSignatures] = useState<SignatureData[]>([]);
  const [hasSigned, setHasSigned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  // 1. App Initialization & Auth Listener
  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          setAppState('dashboard');
        } else {
          setAppState('landing');
        }
      });
      return () => unsubscribe();
    } else {
      // Local fallback if keys are missing
      setTimeout(() => setAppState('landing'), 1500);
    }
  }, []);

  // 2. Fetch Live Signatures (Firebase or Mock)
  useEffect(() => {
    if (appState !== 'dashboard') return;

    if (isFirebaseConfigured && db) {
      const q = query(collection(db, 'signatures'), orderBy('timestamp', 'desc'), limit(50));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SignatureData));
        setSignatures(data);
        if (user && data.some(s => s.name === user.displayName)) setHasSigned(true);
      });
      return () => unsubscribe();
    } else {
      // Mock Data
      setSignatures([
        { id: '1', name: 'Aarav M.', city: 'Delhi NCR', line: 'Yellow Line', timestamp: Date.now() - 100000 },
        { id: '2', name: 'Kabir S.', city: 'Mumbai MMR', line: 'Western Local', timestamp: Date.now() - 500000 },
      ]);
    }
  }, [appState, user]);

  // Update line dropdown automatically
  useEffect(() => {
    setProfile(prev => ({ ...prev, line: METRO_ZONES[prev.city].lines[0].id }));
  }, [profile.city]);

  // 3. Handle Google Login
  const handleGoogleLogin = async () => {
    setAppState('authenticating');
    if (isFirebaseConfigured && auth && googleProvider) {
      try {
        await signInWithPopup(auth, googleProvider);
        // The onAuthStateChanged listener will push us to the dashboard automatically
      } catch (error) {
        console.error("Login failed", error);
        setAppState('landing'); // Revert on failure
      }
    } else {
      // Mock Login
      setTimeout(() => {
        setUser({ displayName: "Demo Commander", photoURL: "" });
        setAppState('dashboard');
      }, 1500);
    }
  };

  const handleSignPetition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signatureData || !user) return;
    
    setIsSubmitting(true);
    const selectedLineName = METRO_ZONES[profile.city].lines.find(l => l.id === profile.line)?.name || profile.line;
    const newSig = {
      name: user.displayName || 'Anonymous Entry',
      city: METRO_ZONES[profile.city].name,
      line: selectedLineName.split('(')[0].trim(),
      timestamp: Date.now(),
    };

    if (isFirebaseConfigured && db) {
      try {
        await addDoc(collection(db, 'signatures'), newSig);
        setHasSigned(true);
      } catch (err) {
        console.error("Error saving to Firebase", err);
      }
    } else {
      // Mock submission
      setTimeout(() => {
        setSignatures(prev => [{ id: Math.random().toString(), ...newSig }, ...prev]);
        setHasSigned(true);
      }, 800);
    }
    setIsSubmitting(false);
  };

  // ==========================================
  // VIEW 1: INITIALIZING
  // ==========================================
  if (appState === 'initializing') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <Cpu className="w-12 h-12 text-purple-500 animate-pulse" />
      </div>
    );
  }

  // ==========================================
  // VIEW 2: HIGH-END LANDING PAGE
  // ==========================================
  if (appState === 'landing' || appState === 'authenticating') {
    return (
      <div className="min-h-screen bg-[#030303] flex flex-col relative overflow-hidden font-sans">
        
        {/* LiDAR 3D Grid Background Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-30 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.4)_0,transparent_100%)] pointer-events-none" />

        <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-4 py-1.5 rounded-full text-[10px] font-bold text-red-400 tracking-[0.2em] uppercase mb-8">
              <AlertTriangle className="w-3.5 h-3.5" /> Directive 404
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white mb-6 leading-tight">
              The National <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">Commute Crisis.</span>
            </h1>
            <p className="text-gray-400 text-base md:text-lg font-light leading-relaxed mb-12 max-w-2xl mx-auto">
              Standard transit seating models are actively destroying ₹4,000 styling routines across the nation. It is time to mandate designated aesthetic protection zones.
            </p>

            {/* Classified Login Terminal */}
            <div className="bg-white/[0.02] border border-white/10 p-8 rounded-3xl backdrop-blur-xl max-w-md mx-auto shadow-2xl">
              <div className="mb-6 flex justify-center">
                <ShieldAlert className="w-10 h-10 text-gray-500" />
              </div>
              <h3 className="text-white font-semibold mb-2">Restricted Ledger Access</h3>
              <p className="text-xs text-gray-400 mb-8">Authentication required to log national aesthetic grievances.</p>
              
              <button 
                onClick={handleGoogleLogin}
                disabled={appState === 'authenticating'}
                className="w-full relative group overflow-hidden rounded-xl p-[1px]"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 opacity-70 group-hover:opacity-100 animate-[spin_3s_linear_infinite]" style={{ backgroundSize: '200% 200%' }} />
                <div className="relative bg-black px-6 py-4 rounded-xl flex items-center justify-center gap-3 transition-all group-hover:bg-black/80">
                  {appState === 'authenticating' ? (
                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                      <span className="text-white font-medium text-sm">Authorize via Google Clearance</span>
                    </>
                  )}
                </div>
              </button>
              
              {!isFirebaseConfigured && (
                 <div className="mt-4 text-[10px] text-amber-500 font-mono text-center">
                   ⚠️ Running in Local Simulation. Add Firebase keys to App.tsx for real auth.
                 </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Live Threat Ticker */}
        <div className="border-t border-white/5 bg-black/50 backdrop-blur-md py-2 overflow-hidden flex whitespace-nowrap relative z-20">
          <motion.div 
            animate={{ x: ["0%", "-50%"] }} 
            transition={{ repeat: Infinity, ease: "linear", duration: 20 }}
            className="flex gap-8 px-4 text-xs font-mono text-gray-400 tracking-wider"
          >
            {[...THREAT_UPDATES, ...THREAT_UPDATES].map((text, i) => (
              <span key={i} className="flex items-center gap-2">
                <Activity className="w-3 h-3 text-red-500" /> {text}
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 3: MAIN PLATFORM DASHBOARD
  // ==========================================
  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 font-sans selection:bg-purple-500/30 selection:text-white pb-32">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-white tracking-tight">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            DIRECTIVE-404
          </div>
          <div className="flex items-center gap-4 text-sm">
            {user?.photoURL && <img src={user.photoURL} alt="Profile" className="w-7 h-7 rounded-full border border-white/20" />}
            <span className="text-gray-300 font-medium">{user?.displayName}</span>
            <button onClick={() => { if(auth) signOut(auth); else setAppState('landing'); }} className="text-xs text-gray-500 hover:text-white transition">Sign Out</button>
          </div>
        </div>
      </nav>

      <div className="pt-32 pb-12 px-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Data Column */}
        <div className="lg:col-span-7 space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Zone Configuration</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest pl-1">Metropolitan Zone</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <select value={profile.city} onChange={(e) => setProfile({...profile, city: e.target.value as CityKey})} className="w-full bg-black border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white appearance-none focus:border-purple-500/50 outline-none">
                    {Object.entries(METRO_ZONES).map(([key, data]) => ( <option key={key} value={key}>{data.name}</option> ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest pl-1">Primary Transit Vector</label>
                <div className="relative">
                  <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <select value={profile.line} onChange={(e) => setProfile({...profile, line: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white appearance-none focus:border-purple-500/50 outline-none">
                    {METRO_ZONES[profile.city].lines.map((line) => ( <option key={line.id} value={line.id}>{line.name}</option> ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-2 gap-4">
              <div className="bg-black/50 p-4 rounded-2xl border border-white/5">
                <Wind className="w-5 h-5 text-blue-400 mb-2" />
                <div className="text-2xl font-bold text-white mb-1">94%</div>
                <p className="text-[10px] text-gray-500">Volume deflation risk.</p>
              </div>
              <div className="bg-black/50 p-4 rounded-2xl border border-white/5">
                <Droplets className="w-5 h-5 text-purple-400 mb-2" />
                <div className="text-2xl font-bold text-white mb-1">₹12k</div>
                <p className="text-[10px] text-gray-500">Avg. skincare loss/mo.</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Action Column */}
        <div className="lg:col-span-5 space-y-6">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-gradient-to-br from-[#121212] to-[#050505] border border-purple-500/20 rounded-3xl p-6">
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
                  <p className="text-xs text-gray-400 mt-1">Logged securely to the national database.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSignPetition} className="space-y-6">
                <SignaturePad onSign={(data) => setSignatureData(data)} />
                <button type="submit" disabled={!signatureData || isSubmitting} className={`w-full py-4 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${signatureData ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-white/5 text-gray-600 cursor-not-allowed'}`}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cryptographically Sign'}
                </button>
              </form>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 h-[250px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-white">Live Ledger</h3>
              <div className="text-[10px] text-gray-500 font-mono flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                {signatures.length} Entries
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-white/10">
              <AnimatePresence>
                {signatures.map((sig) => (
                  <motion.div key={sig.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="bg-white/[0.02] border border-white/5 p-3 rounded-xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center text-xs font-bold text-gray-300 flex-shrink-0">
                      {sig.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="text-sm font-medium text-gray-200 truncate">{sig.name}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest truncate">{sig.city} • {sig.line}</div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
      <footer className="text-center text-[10px] text-gray-600 font-mono pt-4 pb-6 tracking-wider uppercase">
        Initiated by Specific Academic Labs // Pilani Network Core
      </footer>
    </div>
  );
}