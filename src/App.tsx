import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, CheckCircle2, Smartphone, Timer, Share2, Settings, UserCircle, Info, Sun, Video, Ruler, Box, Brain, Sparkles, Loader2, AlertCircle, Eye, EyeOff, ShieldCheck, Target, Lock, Gift, RefreshCw, Search, Bookmark, Check, LogOut } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { analyzeFaceScan, type AnalysisResults } from "./services/geminiService";
import { saveAnalysis, getLatestAnalysis, loginUser, signupUser, logoutUser, supabase, saveRecommendations } from "./lib/supabase";

// --- Components ---

const Header = ({ onStartScan, view, userEmail, onLogout }: { onStartScan: () => void, view: string, userEmail: string | null, onLogout: () => void }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/90 backdrop-blur-xl border-b border-primary/20">
      <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.reload()}>
          <span className="text-xl font-extrabold tracking-tighter text-on-surface font-headline uppercase">Envision Eyewear</span>
        </div>
        {view !== 'landing' && (
          <>
            <nav className="hidden md:flex items-center gap-8">
              <a className="text-primary font-bold font-headline tracking-tight transition-colors uppercase text-xs" href="#scan">Scan</a>
              <a className="text-on-surface-variant font-headline tracking-tight hover:text-primary transition-colors uppercase text-xs" href="#metrics">Metrics</a>
              <a className="text-on-surface-variant font-headline tracking-tight hover:text-primary transition-colors uppercase text-xs" href="#frames">Frames</a>
              <a className="text-on-surface-variant font-headline tracking-tight hover:text-primary transition-colors uppercase text-xs" href="#offers">Offers</a>
            </nav>
            <div className="flex items-center gap-4 relative">
              <Settings className="w-5 h-5 text-on-surface-variant cursor-pointer hover:text-primary transition-colors" />
              {userEmail ? (
                <div className="relative">
                  <div 
                    className="flex items-center gap-2 cursor-pointer group"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                  >
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest group-hover:text-on-surface transition-colors">{userEmail}</span>
                    <UserCircle className="w-5 h-5 text-primary group-hover:text-on-surface transition-colors" />
                  </div>
                  
                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-4 w-48 bg-surface-container-high border border-primary/20 rounded-2xl shadow-2xl overflow-hidden z-[60]"
                      >
                        <div className="p-2">
                          <button 
                            onClick={() => {
                              onLogout();
                              setShowUserMenu(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-on-surface hover:bg-primary hover:text-on-surface transition-all rounded-xl"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <UserCircle className="w-5 h-5 text-on-surface-variant cursor-pointer hover:text-primary transition-colors" />
              )}
            </div>
          </>
        )}
      </div>
    </nav>
  );
};

const Footer = () => (
  <footer className="bg-on-surface text-background w-full py-24 px-8">
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-20">
        <div className="md:col-span-1">
          <div className="text-2xl font-extrabold text-primary mb-6 tracking-tight font-headline uppercase">Envision Eyewear</div>
          <p className="text-sm text-background/60 leading-relaxed mb-8">Redefining eyewear fitting through clinical precision and artificial intelligence.</p>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-primary cursor-pointer hover:bg-primary hover:text-on-surface transition-colors">
              <Share2 className="w-4 h-4" />
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <h4 className="font-headline font-bold text-primary text-xs uppercase tracking-[0.2em]">Product</h4>
          <div className="flex flex-col gap-4">
            <a className="text-sm text-background/60 hover:text-primary transition-all" href="#">How It Works</a>
            <a className="text-sm text-background/60 hover:text-primary transition-all" href="#precision">Scan Technology</a>
          </div>
        </div>
        <div className="space-y-6">
          <h4 className="font-headline font-bold text-primary text-xs uppercase tracking-[0.2em]">Company</h4>
          <div className="flex flex-col gap-4">
            <a className="text-sm text-background/60 hover:text-primary transition-all" href="#">About Us</a>
          </div>
        </div>
      </div>
      <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
        <p className="text-[10px] text-background/40 uppercase tracking-widest">© 2024 Envision Eyewear. All rights reserved.</p>
        <div className="flex gap-8 text-[10px] text-background/40 uppercase tracking-widest font-bold">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary"></span> System Active</span>
          <span>Version 2.4.0</span>
        </div>
      </div>
    </div>
  </footer>
);

// --- Views ---

const AuthGate = ({ onComplete }: { onComplete: (userId: string, email: string) => void }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      let user;
      if (mode === 'login') {
        user = await loginUser(email, password);
      } else {
        user = await signupUser(email, password, name, phone);
      }
      if (user) {
        onComplete(user.id, user.email || email);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-start p-6 overflow-y-auto"
    >
      <div className="w-full max-w-7xl mx-auto py-8 flex justify-center mb-12">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-extrabold tracking-tighter text-on-surface font-headline uppercase">Envision Eyewear</span>
        </div>
      </div>

      <div className="max-w-md w-full space-y-12 text-center pb-12">
        <div className="space-y-4">
          <h2 className="text-4xl md:text-5xl font-headline font-extrabold text-on-surface leading-tight italic">
            {mode === 'signup' ? 'Create Your Profile' : 'Welcome Back'}
          </h2>
          <p className="text-on-surface-variant leading-relaxed font-light text-base">
            {mode === 'signup' 
              ? "Join 'Lens Experts' to save your 3D Face Scan and claim an exclusive 5% in-store discount."
              : "Log in to access your saved biometric reports and frame recommendations."}
          </p>
        </div>

        <div className="space-y-4">
          {mode === 'signup' && (
            <>
              <input 
                type="text" 
                placeholder="Full Name (Optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-8 py-4 bg-surface-container-low border border-primary/10 rounded-full focus:outline-none focus:border-primary transition-all text-on-surface text-center italic"
              />
              <input 
                type="tel" 
                placeholder="Phone Number (Optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-8 py-4 bg-surface-container-low border border-primary/10 rounded-full focus:outline-none focus:border-primary transition-all text-on-surface text-center italic"
              />
            </>
          )}
          <input 
            type="email" 
            placeholder="Enter Your Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-8 py-4 bg-surface-container-low border border-primary/10 rounded-full focus:outline-none focus:border-primary transition-all text-on-surface text-center italic"
          />
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-8 py-4 bg-surface-container-low border border-primary/10 rounded-full focus:outline-none focus:border-primary transition-all text-on-surface text-center italic"
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-6 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {error && (
            <p className="text-red-500 text-xs font-bold uppercase tracking-widest">{error}</p>
          )}
        </div>

        <div className="space-y-6">
          <div className="px-4 py-3 bg-primary/5 rounded-2xl border border-primary/10">
            <p className="text-[10px] leading-relaxed text-on-surface-variant italic">
              <span className="text-primary font-bold uppercase tracking-widest mr-1">Note:</span>
              Please remember the email address used here. You will need to show it to the optician in-store so they can retrieve your recommended eyeglasses for you to try on.
            </p>
          </div>
          <button 
            onClick={handleAuth}
            disabled={isLoading}
            className="w-full bg-on-surface text-background px-8 py-5 rounded-full font-headline font-bold text-xs uppercase tracking-[0.2em] hover:bg-primary transition-all shadow-2xl flex items-center justify-center gap-3 disabled:opacity-70"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? "Processing..." : (mode === 'signup' ? "Create Account & Start Scan" : "Log In & View Results")}
          </button>
          
          <div className="pt-4">
            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">
              {mode === 'signup' ? 'Already an expert?' : 'New to Envision?'} 
              <button 
                onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
                className="ml-2 text-primary cursor-pointer border-b border-primary/40 pb-0.5 hover:text-on-surface hover:border-on-surface transition-all"
              >
                {mode === 'signup' ? 'Log in.' : 'Sign up.'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const DiscountScreen = ({ userEmail, onContinue }: { userEmail: string, onContinue: () => void }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="max-w-3xl mx-auto px-6 py-24 text-center space-y-16"
  >
    <div className="flex justify-center">
      <motion.div 
        animate={{ rotateY: 360 }}
        transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
        className="bg-primary/5 p-10 rounded-full border border-primary/10"
      >
        <Gift className="w-16 h-16 text-primary" />
      </motion.div>
    </div>

    <div className="space-y-6">
      <h2 className="text-4xl md:text-6xl font-headline font-extrabold text-on-surface italic">
        Profile Analyzed.
      </h2>
      <p className="text-xl font-light text-on-surface-variant leading-relaxed">
        Your 5% In-Store Discount has been activated.
      </p>
    </div>

    <div>
      <button 
        onClick={onContinue}
        className="bg-on-surface text-background px-12 py-6 rounded-full font-headline font-bold text-xs uppercase tracking-[0.2em] hover:bg-primary transition-all shadow-2xl"
      >
        View My Recommended Frames
      </button>
    </div>
  </motion.div>
);

const LandingPage = ({ onStartScan }: { onStartScan: () => void }) => (
  <div className="pt-20">
    {/* Hero Section */}
    <section className="relative min-h-[850px] flex items-center justify-center overflow-hidden bg-background">
      <div className="absolute inset-0 medical-grid opacity-[0.1]"></div>
      <div className="max-w-7xl mx-auto px-8 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-start text-left"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary font-headline font-bold text-[10px] uppercase tracking-[0.2em] mb-6">Couture Precision</span>
          <h1 className="text-5xl md:text-8xl font-headline font-extrabold text-on-surface leading-[1.05] tracking-tight mb-8">
            Find Your Perfect <br/><span className="text-primary italic">Frame Fit</span>
          </h1>
          <p className="text-lg text-on-surface-variant max-w-xl mb-12 leading-relaxed font-normal">
            Our AI scans your face to find glasses that look amazing and fit comfortably. Discover your best look in seconds.
          </p>
          <div className="flex flex-col items-start gap-10">
            <button 
              onClick={onStartScan}
              className="bg-on-surface text-background px-12 py-6 rounded-full font-headline font-bold text-lg uppercase tracking-widest hover:bg-primary transition-all shadow-2xl shadow-on-surface/20 flex items-center gap-3 group"
            >
              Start Free Scan
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
            <div className="flex flex-wrap gap-8 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Bespoke Analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-primary" />
                <span>Mobile Optimized</span>
              </div>
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-primary" />
                <span>Instant Results</span>
              </div>
            </div>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          <div className="relative rounded-[3rem] overflow-hidden border-[1px] border-primary/20 shadow-2xl">
            <img 
              alt="Smiling woman using smartphone for 3D face scan" 
              className="w-full h-[700px] object-cover transition-all duration-1000" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAVgdhyHf4566ldk5neJ1wqHgyZTE5ADASVDtSLeiguymvbknGfs5BSky8PH5CXzpK33HvKo3wO_gHWeKkejT1Wgm7SGbll_xsNZF1He6P8Axabmv4MVrWZKOgG3tWeA6VUj09s3TIjEPdA5I9a8yyunOKCSNatVhcBE7GkngbEniFL4mVYNknX7Z5QcNYEUITgOmfd9fIQFKvS0Dyr6VjbDd6V76gFCDqzIiSZKDeQIEiBwwYpKvDp3-YYAKxBtcQxJURGJFrr52dV"
              referrerPolicy="no-referrer"
            />
            {/* Tech Overlays */}
            <div className="absolute top-8 right-8 bg-background/90 backdrop-blur-md border border-primary/20 p-5 rounded-2xl shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span className="font-headline font-bold text-[10px] text-on-surface uppercase tracking-widest">Biometric Mesh</span>
              </div>
              <div className="font-mono text-[10px] text-on-surface-variant">V_POINTS: 12,402</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>

    {/* Trust Bar */}
    <section className="bg-background py-16 border-y border-primary/10">
      <div className="max-w-7xl mx-auto px-8 text-center">
        <p className="text-[10px] font-bold text-primary tracking-[0.3em] uppercase mb-12">Curated by leading fashion houses & optical ateliers</p>
        <div className="flex flex-wrap justify-center items-center gap-16 md:gap-24 opacity-40 transition-all duration-700">
          {["LUMINA", "VISTA", "OPTIC.CO", "FRAMEWORK", "CLARITY"].map((brand) => (
            <div key={brand} className="text-xl font-headline font-extrabold text-on-surface tracking-widest">{brand}</div>
          ))}
        </div>
      </div>
    </section>

    {/* How It Works */}
    <section id="precision" className="py-32 bg-background scroll-mt-24">
      <div className="max-w-7xl mx-auto px-8">
        <div className="max-w-3xl mb-24">
          <h2 className="text-4xl md:text-6xl font-headline font-extrabold text-on-surface mb-8 leading-tight italic">Scientific precision, <br/>tailored for you.</h2>
          <div className="h-[1px] w-24 bg-primary mb-8"></div>
          <p className="text-on-surface-variant text-xl leading-relaxed font-light">Our three-step process combines clinical optometry standards with high-fashion accessibility.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
          {[
            { num: "01", title: "Bespoke Scan", desc: "Use any smartphone camera to perform a high-fidelity 3D scan of your facial structure in under 30 seconds." },
            { num: "02", title: "AI Curation", desc: "Our neural network compares your data against 10,000+ frame styles to determine optimal bridge width and temple length." },
            { num: "03", title: "Virtual Atelier", desc: "Browse a curated selection of frames that are guaranteed to fit your face comfortably and look naturally balanced." }
          ].map((item) => (
            <div key={item.num} className="group relative">
              <div className="text-[6rem] font-headline font-extrabold text-primary/5 leading-none mb-[-2.5rem] transition-colors group-hover:text-primary/10">{item.num}</div>
              <div className="relative z-10">
                <h3 className="text-xl font-headline font-bold text-on-surface mb-4 uppercase tracking-widest">{item.title}</h3>
                <p className="text-on-surface-variant leading-relaxed text-sm font-normal">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Benefits Bento Grid */}
    <section className="py-32 bg-surface-container-low">
      <div className="max-w-7xl mx-auto px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 h-auto md:h-[650px]">
          <div className="md:col-span-8 bg-background rounded-[3rem] p-16 flex flex-col justify-end relative overflow-hidden group border border-primary/10 shadow-sm hover:shadow-2xl transition-all duration-500">
            <img 
              className="absolute inset-0 w-full h-full object-cover opacity-10 group-hover:scale-105 transition-transform duration-[2000ms]" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCnvK_3F1Jf8KXBUBB2E_AHsfU8iuscywQEoMQK-aS4FuAAEwAbSnOmgjsB1soWhcf-z1AOlb-4zJjeZon4Tx07fWLHqjLonJuROpCjOHxuFMo76hHv-OhyHByC_I49zD_xzv0JEDRif7SI9W1Bsb2y56l4g2WUNKVwVw5OhkN8Avtk75I53d4fTi_h0ng043vJTFaBa_3QUZ4EHKbj1qWBWVqwufZZwG6rzZeKPSgN0lIECB0hoHKm444TITwgwi2kHNZNYLoTE-L0"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"></div>
            <div className="relative z-10 max-w-lg">
              <CheckCircle2 className="text-primary w-12 h-12 mb-8" />
              <h3 className="text-4xl font-headline font-extrabold text-on-surface mb-6 italic">Millimeter Accuracy</h3>
              <p className="text-on-surface-variant text-lg leading-relaxed">Unlike generic 'virtual try-ons', we provide real mathematical matches that ensure physical comfort and optical clarity for prescription lenses.</p>
            </div>
          </div>
          <div className="md:col-span-4 bg-on-surface rounded-[3rem] p-12 flex flex-col justify-center text-background shadow-2xl hover:-translate-y-1 transition-transform duration-300">
            <Smartphone className="w-10 h-10 mb-6 text-primary" />
            <h3 className="text-2xl font-headline font-bold mb-4 uppercase tracking-widest">Total Convenience</h3>
            <p className="text-background/60 text-sm leading-relaxed">Skip the physical store visits. Get your measurements taken anywhere, anytime with your smartphone.</p>
          </div>
          <div className="md:col-span-4 bg-background rounded-[3rem] p-12 flex flex-col justify-center border border-primary/10 shadow-sm hover:-translate-y-1 transition-transform duration-300">
            <Timer className="w-10 h-10 mb-6 text-primary" />
            <h3 className="text-2xl font-headline font-bold text-on-surface mb-4 uppercase tracking-widest">Tailored Styles</h3>
            <p className="text-on-surface-variant text-sm leading-relaxed">Our AI understands style trends as much as geometry, recommending frames that complement your aesthetic profile.</p>
          </div>
          <div className="md:col-span-8 bg-background rounded-[3rem] p-12 flex items-center gap-12 overflow-hidden group border border-primary/10 shadow-sm hover:shadow-2xl transition-all duration-500">
            <div className="flex-1">
              <h3 className="text-3xl font-headline font-extrabold text-on-surface mb-6 italic">Shop Professional Network</h3>
              <p className="text-on-surface-variant text-lg leading-relaxed">Connect your scan results directly to over 500+ certified optical boutiques for local pickup and adjustment.</p>
            </div>
            <div className="flex-none hidden lg:block">
              <div className="w-40 h-40 rounded-2xl border-[1px] border-primary/20 overflow-hidden shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-500">
                <img 
                  className="w-full h-full object-cover" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCfczivJrg3XveSwL2d7xrQl3vzT6qm4apZT-CJh_zoryktQpRDXeyXPqWy7jQZ_VFb4POcemixz92SIh7IiByxx5mXHaS5Ag4IIZwUoC7937SXaaISc_kp_56VovIwfb310iaC4W3enw8z_9GSzpQP1CMm3mEPkARrnBZkJGJApUsRTCuY7U0N6a7xMHvvp15FhsK0jcGna2F-igEYNleVtr6itWwvkSgY62ZbIaZWm11nPQv4Mn-82NkTNjc04WpeIzX5CGOw1ajx"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
);

const ScanPage = ({ onComplete }: { onComplete: (results: AnalysisResults, snapshots: string[]) => void }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [instruction, setInstruction] = useState("Position your face in the guide");
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const snapshotsRef = useRef<string[]>([]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Camera access denied. Please enable camera permissions to proceed.");
    }
  };

  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoRef.current, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      snapshotsRef.current.push(base64);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = () => {
    if (!streamRef.current) return;

    setError(null);
    setIsRecording(true);
    setProgress(0);
    snapshotsRef.current = [];

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 2;
      setProgress(currentProgress);

      if (currentProgress === 20) {
        setInstruction("Hold steady - Capturing Center...");
        captureSnapshot();
      } else if (currentProgress === 50) {
        setInstruction("Turn head RIGHT - Capturing Profile...");
        captureSnapshot();
      } else if (currentProgress === 80) {
        setInstruction("Turn head LEFT - Capturing Profile...");
        captureSnapshot();
      } else if (currentProgress < 20) {
        setInstruction("Hold steady...");
      } else if (currentProgress < 50) {
        setInstruction("Slowly turn your head to the RIGHT");
      } else if (currentProgress < 80) {
        setInstruction("Slowly turn your head to the LEFT");
      } else if (currentProgress < 100) {
        setInstruction("Finalizing capture...");
      }

      if (currentProgress >= 100) {
        clearInterval(interval);
        setIsRecording(false);
        processSnapshots();
      }
    }, 100);
  };

  const processSnapshots = async () => {
    setIsAnalyzing(true);
    setInstruction("Analyzing facial biometrics...");
    
    try {
      const results = await analyzeFaceScan(snapshotsRef.current);
      onComplete(results, snapshotsRef.current);
    } catch (err) {
      console.error("Analysis error:", err);
      setError("Biometric analysis failed. Please try again in better lighting.");
      setIsAnalyzing(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-6 py-24 space-y-24">
      <section className="flex flex-col items-center text-center space-y-12">
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold">AI-Powered Fitting</p>
          <h1 className="font-headline text-5xl md:text-7xl font-extrabold tracking-tight text-on-surface italic">
            {isAnalyzing ? "Processing..." : "Scan Your Face"}
          </h1>
        </div>
        
        <div className="flex flex-col lg:flex-row items-center justify-center gap-12 w-full">
          <div className="w-full lg:w-1/3 text-left">
            <div className="bg-background p-10 rounded-[2rem] border border-primary/20 shadow-2xl space-y-8">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Info className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-headline font-bold text-on-surface uppercase tracking-widest text-sm">Protocol</h3>
              </div>
              <div className="space-y-6">
                <p className="text-on-surface-variant leading-relaxed text-sm">
                  1. Align your face within the golden guide.<br/>
                  2. Ensure even lighting across your features.<br/>
                  3. Follow the directional prompts with slow, fluid motion.
                </p>
                <div className="p-6 bg-on-surface text-background rounded-2xl border border-primary/20">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Precision Tip</p>
                  <p className="text-xs leading-relaxed opacity-80">
                    Maintain a neutral expression for the most accurate anatomical mapping.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative w-full max-w-2xl aspect-video rounded-[3rem] overflow-hidden bg-on-surface flex items-center justify-center shadow-2xl group border-[1px] border-primary/20">
            <video 
              ref={videoRef}
              autoPlay 
              playsInline 
              muted 
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1] opacity-80"
            />
            <div className="absolute inset-0 mesh-overlay opacity-40"></div>
            
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-80 md:w-72 md:h-96 border-[1px] border-primary rounded-[50%/60%_60%_40%_40%] relative flex items-center justify-center shadow-[0_0_0_1000px_rgba(26,26,26,0.6)]">
                <div className="w-full h-[1px] bg-primary/20 absolute top-1/2 -translate-y-1/2"></div>
                <div className="h-full w-[1px] bg-primary/20 absolute left-1/2 -translate-x-1/2"></div>
                {isRecording && (
                  <motion.div 
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 border-[1px] border-primary/40 rounded-full"
                  ></motion.div>
                )}
              </div>
            </div>

            <div className="absolute top-8 right-8 flex items-center gap-2 bg-background/80 backdrop-blur-md px-4 py-2 rounded-full border border-primary/20">
              <div className={`w-2 h-2 rounded-full bg-primary ${isRecording ? 'animate-pulse' : ''}`}></div>
              <span className="text-[10px] font-bold text-on-surface uppercase tracking-widest">
                {isAnalyzing ? "Analyzing" : "Live Feed"}
              </span>
            </div>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full px-12 text-center space-y-4">
              <div className="bg-background/90 backdrop-blur-md px-8 py-4 rounded-full border border-primary/20 inline-block shadow-2xl">
                <p className="text-on-surface font-headline font-bold text-sm uppercase tracking-widest">
                  {instruction}
                </p>
              </div>
              {(isRecording || isAnalyzing) && (
                <div className="w-full bg-white/10 h-[1px] rounded-full overflow-hidden backdrop-blur-md">
                  <motion.div 
                    className="bg-primary h-full"
                    animate={{ width: `${progress}%` }}
                  ></motion.div>
                </div>
              )}
            </div>
            
            {isAnalyzing && (
              <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-[4px] flex flex-col items-center justify-center space-y-6">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-primary font-headline font-bold uppercase tracking-[0.3em] text-xs">Analyzing Your Features</p>
              </div>
            )}
          </div>
        </div>

        {error ? (
          <div className="flex items-center gap-3 bg-error/5 text-error px-8 py-5 rounded-full border border-error/20">
            <AlertCircle className="w-5 h-5" />
            <p className="text-xs font-bold uppercase tracking-widest">{error}</p>
            <button onClick={() => { setError(null); startCamera(); }} className="underline ml-4 text-xs font-bold uppercase tracking-widest">Retry</button>
          </div>
        ) : (
          <button 
            onClick={startRecording}
            disabled={isRecording || isAnalyzing}
            className="flex items-center gap-4 bg-on-surface text-background px-12 py-6 rounded-full font-headline font-bold text-lg uppercase tracking-widest hover:bg-primary transition-all active:scale-95 shadow-2xl disabled:opacity-50 group"
          >
            {isRecording ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Video className="w-6 h-6 group-hover:scale-110 transition-transform" />
            )}
            {isRecording ? "Capturing..." : isAnalyzing ? "Analyzing..." : "Begin Analysis"}
          </button>
        )}
      </section>
    </main>
  );
};
const ResultsPage = ({ 
  results, 
  onRescan, 
  onRefine, 
  isRefining, 
  userEmail, 
  userId, 
  canRefine,
  onSave,
  isSaving,
  saveSuccess,
  userGuidelines
}: { 
  results: AnalysisResults, 
  onRescan: () => void, 
  onRefine: (text: string) => void, 
  isRefining: boolean, 
  userEmail: string | null, 
  userId: string | null, 
  canRefine: boolean,
  onSave: () => void,
  isSaving: boolean,
  saveSuccess: boolean,
  userGuidelines: string | null
}) => {
  const [showRefinement, setShowRefinement] = useState(false);
  const [refinementText, setRefinementText] = useState("");
  const [savedFrames, setSavedFrames] = useState<Set<number>>(new Set());
  const [isSavingRecommendations, setIsSavingRecommendations] = useState(false);
  const [recommendationsSaved, setRecommendationsSaved] = useState(false);

  const handleUpdateProfile = () => {
    if (refinementText.trim()) {
      onRefine(refinementText);
      setShowRefinement(false);
    }
  };

  const handleSaveFrame = async (frame: any, index: number) => {
    // Table 'saved_frames' does not exist in schema, so we just mark it as saved locally for UI feedback
    setSavedFrames(prev => new Set(prev).add(index));
  };

  const handleSaveRecommendations = async () => {
    if (!userId || isSavingRecommendations) return;
    setIsSavingRecommendations(true);
    try {
      await saveRecommendations(userId, results.frameRecommendations);
      setRecommendationsSaved(true);
      setTimeout(() => setRecommendationsSaved(false), 3000);
    } catch (err: any) {
      alert('Failed to save recommendations: ' + err.message);
    } finally {
      setIsSavingRecommendations(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-6 py-24 space-y-24 scroll-smooth">
      {isRefining && (
        <div className="fixed inset-0 z-[100] bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-primary font-headline font-bold uppercase tracking-[0.3em] text-xs">Refining Recommendations...</p>
        </div>
      )}
      <section id="scan" className="space-y-12 scroll-mt-32">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-primary/20 pb-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold mb-2">Analysis Complete</p>
            <h2 className="font-headline text-4xl md:text-6xl font-extrabold tracking-tight text-on-surface italic">Your Biometric Profile</h2>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={onRescan}
              className="flex items-center gap-2 px-6 py-3 rounded-full border border-primary/20 text-[10px] font-bold uppercase tracking-widest text-on-surface hover:bg-primary hover:text-on-surface transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Redo Analysis
            </button>
            <div className="bg-on-surface text-primary px-6 py-3 rounded-full flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4" />
              Clinical Verification
            </div>
          </div>
        </div>

        {/* Scientific Measurements */}
        <div id="metrics" className="grid grid-cols-1 md:grid-cols-4 gap-6 scroll-mt-32">
          {[
            { icon: Eye, label: "Pupillary Distance", value: results.measurements.ipd, unit: "mm", rationale: results.scientificRationale.ipd, tag: "IPD" },
            { icon: Ruler, label: "Anatomical Bridge", value: results.measurements.bridgeWidth, unit: "mm", rationale: results.scientificRationale.bridge, tag: "BRIDGE" },
            { icon: Target, label: "Face Breadth", value: results.measurements.faceWidth, unit: "mm", rationale: "Total zygomatic width measured via 3D mesh analysis.", tag: "WIDTH" },
            { icon: Brain, label: "Facial Structure", value: results.faceGeometry, unit: "", rationale: results.scientificRationale.geometry, tag: "GEOMETRY" }
          ].map((metric, i) => (
            <div key={i} className="bg-background p-8 rounded-[2rem] border border-primary/10 shadow-sm hover:shadow-2xl transition-all duration-500 group">
              <div className="flex justify-between items-start mb-8">
                <metric.icon className="text-primary w-8 h-8 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold text-primary/40 uppercase tracking-widest">{metric.tag}</span>
              </div>
              <h3 className="font-headline text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">{metric.label}</h3>
              <p className="text-4xl font-extrabold text-on-surface mb-4">
                {metric.value}<span className="text-lg font-normal text-primary ml-1">{metric.unit}</span>
              </p>
              <p className="text-[10px] text-on-surface-variant leading-relaxed uppercase tracking-wider opacity-60">{metric.rationale}</p>
            </div>
          ))}
        </div>

        {/* Style & Special Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-on-surface text-background p-12 rounded-[3rem] shadow-2xl space-y-8">
            <div className="flex items-center gap-3">
              <Sparkles className="text-primary w-6 h-6" />
              <h3 className="font-headline text-2xl font-bold italic">Aesthetic Profile</h3>
            </div>
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3">Classification</p>
                <p className="text-background/80 leading-relaxed font-light text-lg">{results.styleProfile.aesthetic}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3">Curation Strategy</p>
                <p className="text-background/60 leading-relaxed text-sm">{results.styleProfile.recommendations}</p>
              </div>
            </div>
          </div>

          <div className="bg-background p-12 rounded-[3rem] border border-primary/10 shadow-sm space-y-8">
            <div className="flex items-center gap-3">
              <Info className="text-primary w-6 h-6" />
              <h3 className="font-headline text-2xl font-bold text-on-surface italic">Anatomical Notes</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {results.specialFeatures.map((feature, i) => (
                <span key={i} className="px-5 py-2 bg-primary/5 rounded-full text-[10px] font-bold text-primary border border-primary/10 uppercase tracking-widest">
                  {feature}
                </span>
              ))}
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed font-light">
              These biometric markers are essential for ensuring frame stability and preventing optical distortion during prolonged wear.
            </p>
          </div>
        </div>

        {/* Psychological & Purchase Guidance */}
        <div id="offers" className="bg-on-surface text-background rounded-[3rem] p-16 relative overflow-hidden shadow-2xl scroll-mt-32">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/10 to-transparent"></div>
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-16">
            <div className="lg:col-span-2 space-y-10">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Brain className="text-primary w-6 h-6" />
                  <h3 className="font-headline text-3xl font-bold italic">Behavioral Insights</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  {results.psychologicalProfile.traits.map((trait, i) => (
                    <span key={i} className="px-4 py-1.5 bg-white/5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10 text-primary">
                      {trait}
                    </span>
                  ))}
                </div>
                <p className="text-background/60 leading-relaxed text-lg font-light">
                  {results.psychologicalProfile.purchaseBehavior}
                </p>
              </div>
              <div className="p-8 bg-white/5 rounded-[2rem] border border-white/5">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-4 italic">Stylist Guidance</p>
                <p className="text-base leading-relaxed italic text-background/80">
                  {userGuidelines ? (
                    `"${userGuidelines}"`
                  ) : (
                    "The best fashion is chosen according to the latest fashion oriented eyeglasses in the shop."
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-col justify-center items-center lg:items-end space-y-8">
              <div className="bg-primary/10 px-6 py-3 rounded-full border border-primary/20">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3" />
                  Profile Synchronized
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Frame Recommendations */}
        <div id="frames" className="space-y-16 scroll-mt-32">
          <div className="space-y-4">
            <p className="text-[10px] uppercase tracking-[0.4em] text-primary font-bold">The Selection</p>
            <h2 className="font-headline text-5xl md:text-7xl font-extrabold tracking-tight text-on-surface italic">Curated Frames</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
            {results.frameRecommendations.map((frame, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                className="group relative"
              >
                <div className="aspect-[4/3] bg-surface-container-low rounded-[2.5rem] mb-10 flex items-center justify-center p-12 relative overflow-hidden border border-primary/5 shadow-sm group-hover:shadow-2xl transition-all duration-500">
                  <motion.img 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    whileHover={{ scale: 1.1, rotate: -2 }}
                    className="max-w-full h-auto object-contain relative z-10 drop-shadow-2xl" 
                    src={frame.imageUrl}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  {/* Hover Overlay Save Button */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 bg-on-surface/5 backdrop-blur-[2px]">
                    <button 
                      onClick={() => handleSaveFrame(frame, index)}
                      className={`flex items-center gap-3 px-8 py-4 rounded-full font-headline font-bold text-xs uppercase tracking-widest transition-all transform translate-y-4 group-hover:translate-y-0 ${savedFrames.has(index) ? 'bg-primary text-on-surface' : 'bg-on-surface text-background hover:bg-primary hover:text-on-surface'}`}
                    >
                      {savedFrames.has(index) ? (
                        <>
                          <Check className="w-4 h-4" />
                          Saved to Atelier
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-4 h-4" />
                          Save to Collection
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-6 px-4">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <h3 className="font-headline text-3xl font-bold text-on-surface italic group-hover:text-primary transition-colors">{frame.name}</h3>
                      <p className="text-primary font-bold text-[10px] uppercase tracking-widest mt-1">{frame.model}</p>
                    </div>
                    <button 
                      onClick={() => handleSaveFrame(frame, index)}
                      className={`p-3 rounded-full border transition-all ${savedFrames.has(index) ? 'bg-primary border-primary text-on-surface' : 'border-primary/20 text-primary hover:bg-primary/10 hover:scale-110'}`}
                    >
                      {savedFrames.has(index) ? <Check className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                    </button>
                  </div>
                  
                  <motion.div 
                    initial={{ opacity: 0.8 }}
                    whileHover={{ opacity: 1 }}
                    className="p-8 bg-background rounded-[2rem] border border-primary/10 shadow-sm group-hover:border-primary/30 transition-all duration-500"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="text-primary w-4 h-4 animate-pulse" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Curation Rationale</span>
                    </div>
                    <p className="text-on-surface-variant leading-relaxed text-sm font-light italic">
                      {frame.scientificRationale}
                    </p>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Refine Recommendations Button */}
          <div className="mt-12 flex flex-col items-center gap-8">
            <button 
              onClick={() => setShowRefinement(true)}
              className="flex items-center gap-3 px-10 py-5 rounded-full border border-primary/20 bg-background text-on-surface font-headline font-bold text-xs uppercase tracking-widest hover:bg-primary/5 transition-all shadow-xl"
            >
              <Search className="w-4 h-4 text-primary" />
              Redo Recommendations
            </button>
            
            <div className="max-w-2xl text-center p-8 bg-primary/5 rounded-[2rem] border border-primary/10">
              <p className="text-sm text-on-surface-variant leading-relaxed italic">
                Please visit the store and give the optician your email that you signed up with so he can show you the eyeglasse frames for you to try on.
              </p>
            </div>
          </div>
        </div>

        {/* Stylist Toolbar */}
        {canRefine && (
          <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-40 flex items-center gap-6 bg-on-surface/95 backdrop-blur-2xl px-10 py-5 rounded-full border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <button 
              onClick={() => setShowRefinement(true)}
              className="flex items-center gap-3 text-primary font-headline font-bold text-xs uppercase tracking-widest hover:text-white transition-all"
            >
              <Search className="w-4 h-4" />
              Refine Selection
            </button>
            <div className="w-[1px] h-5 bg-white/10"></div>
            <button 
              onClick={onRescan}
              className="flex items-center gap-3 text-white/40 font-headline font-bold text-xs uppercase tracking-widest hover:text-white transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Re-Scan
            </button>
          </div>
        )}

        {/* Refinement Panel */}
        <AnimatePresence>
          {showRefinement && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowRefinement(false)}
                className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md"
              />
              <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 200 }}
                className="fixed bottom-0 left-0 w-full z-[70] bg-background border-t border-primary/20 p-16 rounded-t-[4rem] shadow-[0_-20px_50px_rgba(0,0,0,0.2)]"
              >
                <div className="max-w-3xl mx-auto space-y-12">
                  <div className="space-y-4 text-center">
                    <h3 className="text-4xl md:text-5xl font-headline font-extrabold text-on-surface italic">Refine Your Aesthetic</h3>
                    <p className="text-on-surface-variant font-light text-lg">Direct our AI stylist to your preferred silhouette or palette.</p>
                  </div>
                  <div className="space-y-6">
                    <input 
                      type="text" 
                      placeholder="e.g., Show me more round frames, darker colors, or 'academic chic' styles."
                      value={refinementText}
                      onChange={(e) => setRefinementText(e.target.value)}
                      className="w-full px-10 py-8 bg-surface-container-low border border-primary/10 rounded-[2rem] focus:outline-none focus:border-primary transition-all text-xl font-light italic"
                    />
                    <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] text-center">
                      Describe your ideal eyewear aesthetic.
                    </p>
                    <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10">
                      <p className="text-xs text-on-surface-variant leading-relaxed text-center italic">
                        The analysis will take into consideration your guidelines to provide a more personalized selection.
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={handleUpdateProfile}
                    className="w-full bg-on-surface text-background px-10 py-6 rounded-full font-headline font-bold text-sm uppercase tracking-widest hover:bg-primary transition-all shadow-2xl"
                  >
                    Update Style Profile
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
};


// --- Main App ---

export default function App() {
  const [view, setView] = useState<'landing' | 'auth' | 'scanning' | 'discount' | 'results'>('landing');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
  const [snapshots, setSnapshots] = useState<string[]>([]);
  const [isRefining, setIsRefining] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [userGuidelines, setUserGuidelines] = useState<string | null>(null);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUserId(session.user.id);
        setUserEmail(session.user.email || null);
        setUserName(session.user.user_metadata?.full_name || session.user.user_metadata?.display_name || null);
      }
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUserId(session.user.id);
        setUserEmail(session.user.email || null);
        setUserName(session.user.user_metadata?.full_name || session.user.user_metadata?.display_name || null);
      } else {
        setUserId(null);
        setUserEmail(null);
        setUserName(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleStartScan = async () => {
    if (userId) {
      const existing = await getLatestAnalysis(userId);
      if (existing) {
        setAnalysisResults(existing);
        setView('results');
      } else {
        setView('scanning');
      }
    } else {
      setView('auth');
    }
  };

  const handleAuthComplete = async (id: string, email: string) => {
    setUserId(id);
    setUserEmail(email);
    const existing = await getLatestAnalysis(id);
    if (existing) {
      setAnalysisResults(existing);
      setView('results');
    } else {
      setView('scanning');
    }
  };

  const handleScanComplete = (results: AnalysisResults, capturedSnapshots: string[]) => {
    setAnalysisResults(results);
    setSnapshots(capturedSnapshots);
    setView('discount');
    
    // Automatically store results in profiles and recommendations tables if user is logged in
    if (userId) {
      saveAnalysis(results).catch(err => {
        console.error("Auto-save analysis failed:", err);
      });
      saveRecommendations(userId, results.frameRecommendations).catch(err => {
        console.error("Auto-save recommendations failed:", err);
      });
    }
  };

  const handleRefine = async (refinementText: string) => {
    if (!snapshots.length) return;
    setIsRefining(true);
    setUserGuidelines(refinementText);
    try {
      const results = await analyzeFaceScan(snapshots, refinementText);
      setAnalysisResults(results);
      
      // Automatically store refined results in profiles and recommendations tables if user is logged in
      if (userId) {
        saveAnalysis(results).catch(err => {
          console.error("Auto-save refined analysis failed:", err);
        });
        saveRecommendations(userId, results.frameRecommendations).catch(err => {
          console.error("Auto-save refined recommendations failed:", err);
        });
      }
    } catch (err) {
      console.error("Refinement error:", err);
    } finally {
      setIsRefining(false);
    }
  };

  const handleRescan = () => {
    setView('scanning');
  };

  const handleSaveToProfile = async () => {
    if (!userId || !analysisResults || isSaving) return;
    
    setIsSaving(true);
    try {
      const ipdValue = parseFloat(analysisResults.measurements?.ipd_mm?.toString() || analysisResults.measurements?.ipd?.toString() || '0');
      
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          full_name: userName,
          last_ipd_result: ipdValue,
          ipd_measurement: ipdValue,
          face_shape: analysisResults.face_shape || analysisResults.faceGeometry,
          preferred_style: analysisResults.styleProfile?.aesthetic || null,
          face_analysis_raw: analysisResults
        });

      if (error) throw error;
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error("Save failed:", err);
      alert('Save failed: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setView('landing');
      setUserId(null);
      setUserEmail(null);
      setAnalysisResults(null);
      setSnapshots([]);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-background selection:bg-primary/10">
      <Header onStartScan={handleStartScan} view={view} userEmail={userEmail} onLogout={handleLogout} />
      
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
        >
          {view === 'landing' && <LandingPage onStartScan={handleStartScan} />}
          {view === 'auth' && <AuthGate onComplete={handleAuthComplete} />}
          {view === 'scanning' && <ScanPage onComplete={handleScanComplete} />}
          {view === 'discount' && userEmail && <DiscountScreen userEmail={userEmail} onContinue={() => setView('results')} />}
          {view === 'results' && analysisResults && (
            <ResultsPage 
              results={analysisResults} 
              onRescan={handleRescan} 
              onRefine={handleRefine}
              isRefining={isRefining}
              userEmail={userEmail}
              userId={userId}
              canRefine={snapshots.length > 0}
              onSave={handleSaveToProfile}
              isSaving={isSaving}
              saveSuccess={saveSuccess}
              userGuidelines={userGuidelines}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <Footer />
    </div>
  );
}
