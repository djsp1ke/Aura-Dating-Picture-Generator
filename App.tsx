
import React, { useState, useRef, useEffect } from 'react';
import { Layout } from './components/Layout';
import { PRESETS } from './constants';
import { editImage } from './services/geminiService';
import { AppStatus, ImageData, HistoryItem } from './types';

// --- View Components ---

const HowItWorksView = () => (
  <div className="max-w-4xl mx-auto py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <div className="text-center mb-16">
      <h1 className="text-5xl font-black mb-6 bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent italic">Professional Profiles in Seconds</h1>
      <p className="text-xl text-gray-400">Our AI uses behavioral data from over 10M matches to optimize your visibility on dating apps.</p>
    </div>
    
    <div className="grid md:grid-cols-3 gap-8">
      {[
        { step: "01", title: "Upload", desc: "Start with any clear photo. Our AI identifies key identity markers (like your unique tattoos) to ensure the result looks exactly like you, just better.", icon: "📸" },
        { step: "02", title: "Optimize", desc: "Our AI applies 'Dating Heuristics'—optimizing for approachability, lighting, and removing background clutter that kills match rates.", icon: "⚡" },
        { step: "03", title: "Match", desc: "Subscribe to Aura Pro to download your high-res results optimized for Tinder, Bumble, and Hinge algorithms.", icon: "🔥" }
      ].map((item, idx) => (
        <div key={idx} className="bg-[#121212] border border-white/5 p-8 rounded-3xl relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 text-9xl font-black text-white/5 group-hover:text-orange-500/10 transition-colors">{item.step}</div>
          <div className="text-4xl mb-4">{item.icon}</div>
          <h3 className="text-xl font-bold mb-3">{item.title}</h3>
          <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
        </div>
      ))}
    </div>

    <div className="mt-20 bg-gradient-to-br from-gray-900 to-black p-12 rounded-[3rem] border border-white/10 text-center">
      <h2 className="text-3xl font-bold mb-4">Ready to boost your match rate?</h2>
      <p className="text-gray-400 mb-8 max-w-xl mx-auto">Users see an average 3x increase in high-quality matches after optimizing their first 3 profile photos with Aura.</p>
      <button className="bg-orange-500 text-white px-8 py-4 rounded-2xl font-black hover:scale-105 transition-transform shadow-xl shadow-orange-500/20">
        START OPTIMIZING NOW
      </button>
    </div>
  </div>
);

const PricingView = ({ isSubscribed, onUpgrade }: { isSubscribed: boolean, onUpgrade: () => void }) => (
  <div className="max-w-5xl mx-auto py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <div className="text-center mb-16">
      <h1 className="text-5xl font-black mb-6">Simple, Transparent Pricing</h1>
      <p className="text-xl text-gray-400">Boost your dating ROI. Only pay for what matters: the results.</p>
    </div>

    <div className="grid md:grid-cols-2 gap-8 items-center max-w-4xl mx-auto">
      <div className="bg-[#121212] border border-white/5 p-10 rounded-[2.5rem] relative">
        <h3 className="text-2xl font-bold mb-2">Free</h3>
        <p className="text-gray-500 mb-8 text-sm italic">Test the AI for free</p>
        <div className="text-4xl font-black mb-8">$0 <span className="text-sm font-normal text-gray-500">/ forever</span></div>
        <ul className="space-y-4 mb-10 text-sm text-gray-300">
          <li className="flex items-center gap-2">✅ AI Photo Refinement</li>
          <li className="flex items-center gap-2">✅ Core Enhancement Presets</li>
          <li className="flex items-center gap-2">✅ Session History</li>
          <li className="flex items-center gap-2 text-gray-600">❌ High-Res Downloads</li>
          <li className="flex items-center gap-2 text-gray-600">❌ 4K High-Res Exports</li>
        </ul>
        <div className="w-full py-4 rounded-2xl border border-white/10 text-center font-bold text-gray-500">
          {isSubscribed ? 'Basic Tier' : 'Current Plan'}
        </div>
      </div>

      <div className="bg-white text-black p-10 rounded-[2.5rem] relative shadow-2xl shadow-orange-500/20 scale-105 border-4 border-orange-500">
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">PRO ACCESS</div>
        <h3 className="text-2xl font-bold mb-2">Aura Pro</h3>
        <p className="text-gray-600 mb-8 text-sm italic">For the serious dater</p>
        <div className="text-4xl font-black mb-8">$9.99 <span className="text-sm font-normal text-gray-500">/ month</span></div>
        <ul className="space-y-4 mb-10 text-sm font-medium">
          <li className="flex items-center gap-2 text-orange-600">✅ UNLIMITED 4K Downloads</li>
          <li className="flex items-center gap-2">✅ All Background Presets</li>
          <li className="flex items-center gap-2">✅ Custom AI Refinement</li>
          <li className="flex items-center gap-2">✅ Priority Cloud Generation</li>
          <li className="flex items-center gap-2">✅ Remove Aura Watermarks</li>
        </ul>
        <button 
          onClick={onUpgrade}
          disabled={isSubscribed}
          className={`w-full py-4 rounded-2xl font-black transition-all shadow-xl ${
            isSubscribed ? 'bg-green-600 text-white cursor-default' : 'bg-orange-500 text-white hover:brightness-110 active:scale-95'
          }`}
        >
          {isSubscribed ? '✓ Pro Subscribed' : 'Unlock Downloads Now'}
        </button>
      </div>
    </div>
  </div>
);

const SafetyView = () => (
  <div className="max-w-4xl mx-auto py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <div className="mb-16">
      <h1 className="text-5xl font-black mb-6">Your Safety is Paramount</h1>
      <p className="text-xl text-gray-400">We take privacy as seriously as you take your dating life. We ensure your data is secure and never misused.</p>
    </div>

    <div className="grid gap-8">
      {[
        { title: "No Permanent Image Storage", desc: "Aura is designed as a processing engine, not a storage platform. Photos are purged from our temporary processing environment immediately after your session ends.", icon: "🛡️" },
        { title: "Identity Fingerprinting", desc: "Our AI 'fingerprints' your facial structure and distinctive marks (like your unique tattoos) to ensure we enhance YOU, not a generic version of a person. We never store this identity data.", icon: "👤" },
        { title: "Zero Data Training", desc: "Your personal photos are never used to train the underlying Gemini models. They are treated as one-time inputs to generate your optimized profile pictures.", icon: "✨" },
        { title: "Content Moderation", desc: "We use sophisticated filters to ensure that Aura is only used for positive, dating-focused enhancements. Attempting to create offensive or harmful imagery is blocked at the source.", icon: "⚖️" }
      ].map((item, idx) => (
        <div key={idx} className="flex gap-6 p-8 bg-[#121212] border border-white/5 rounded-3xl hover:bg-[#181818] transition-colors">
          <div className="text-4xl p-4 bg-white/5 rounded-2xl h-fit">{item.icon}</div>
          <div>
            <h3 className="text-xl font-bold mb-2">{item.title}</h3>
            <p className="text-gray-400 leading-relaxed text-sm">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const PrivacyView = () => (
  <div className="max-w-4xl mx-auto py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <h1 className="text-5xl font-black mb-10">Privacy Policy</h1>
    <div className="prose prose-invert max-w-none text-gray-400 space-y-8">
      <p className="text-lg">At Aura AI, we believe your photos are your business. Our Privacy Policy is designed to be simple, transparent, and protective.</p>
      
      <section>
        <h2 className="text-2xl font-bold text-white mb-4 border-l-4 border-orange-500 pl-4">1. Data Ownership</h2>
        <p>You retain full ownership of any images you upload to Aura. We do not claim any rights to your content. We only process your images to provide the services you request.</p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-white mb-4 border-l-4 border-orange-500 pl-4">2. Processing vs. Storage</h2>
        <p>Your images are processed via the Google Gemini API. This is a real-time process. Once your edited image is returned to your browser, the original and edited versions only exist in your browser's local memory (RAM). We do not save them to a permanent database.</p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-white mb-4 border-l-4 border-orange-500 pl-4">3. Local Session Data</h2>
        <p>Your "Version History" is stored locally on your device for the duration of your tab's life. Clearing your browser cache or clicking "Reset" in the app permanently deletes this history.</p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-white mb-4 border-l-4 border-orange-500 pl-4">4. Third-Party Sharing</h2>
        <p>We do not sell, rent, or trade your personal data. The only third-party involved is Google (as our AI infrastructure provider), which processes your images under strict security protocols.</p>
      </section>
    </div>
  </div>
);

const TermsView = () => (
  <div className="max-w-4xl mx-auto py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <h1 className="text-5xl font-black mb-10">Terms of Service</h1>
    <div className="prose prose-invert max-w-none text-gray-400 space-y-8">
      <p className="text-lg">By accessing Aura AI, you agree to these terms. Please read them carefully.</p>
      
      <section>
        <h2 className="text-2xl font-bold text-white mb-4 border-l-4 border-pink-500 pl-4">1. Acceptable Use</h2>
        <p>You agree to use Aura only for personal, non-commercial purposes related to dating profile optimization. You must not use the service to create deceptive deepfakes, harass others, or process images you do not have the rights to.</p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-white mb-4 border-l-4 border-pink-500 pl-4">2. Subscription & Payments</h2>
        <p>Aura Pro is a recurring subscription. By subscribing, you authorize us to charge your payment method for the amount specified. You can cancel at any time. Downloads are only available to active subscribers.</p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-white mb-4 border-l-4 border-pink-500 pl-4">3. AI-Generated Content</h2>
        <p>While our AI is highly advanced, results may vary based on photo quality. We do not guarantee specific outcomes in your dating life. AI edits are subjective interpretations of "enhancement".</p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-white mb-4 border-l-4 border-pink-500 pl-4">4. Termination</h2>
        <p>We reserve the right to block access to the service for any user who violates these terms or attempts to bypass our paywall or security features.</p>
      </section>
    </div>
  </div>
);

// --- Main Editor Component ---

const App: React.FC = () => {
  const [view, setView] = useState<'editor' | 'how-it-works' | 'pricing' | 'safety' | 'privacy' | 'terms'>('editor');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [original, setOriginal] = useState<ImageData | null>(null);
  const [edited, setEdited] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [customPrompt, setCustomPrompt] = useState('');
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setOriginal({
          base64: event.target.result as string,
          mimeType: file.type
        });
        setEdited(null);
        setHistory([]);
        setErrorMsg(null);
        setStatus(AppStatus.IDLE);
      }
    };
    reader.readAsDataURL(file);
  };

  const onEdit = async (prompt: string, presetId?: string) => {
    if (!original) return;
    
    setStatus(AppStatus.EDITING);
    setActivePreset(presetId || 'custom');
    setErrorMsg(null);

    try {
      const result = await editImage(original, prompt);
      setEdited(result);
      
      const newHistoryItem: HistoryItem = {
        id: Math.random().toString(36).substr(2, 9),
        url: result,
        prompt: prompt,
        timestamp: Date.now()
      };
      
      setHistory(prev => [newHistoryItem, ...prev]);
      setStatus(AppStatus.COMPLETED);
      setCustomPrompt('');
    } catch (err) {
      console.error(err);
      setErrorMsg("The AI encountered an issue. This usually happens with restricted content or connection timeouts. Please try a different photo.");
      setStatus(AppStatus.ERROR);
    }
  };

  const downloadImage = () => {
    if (!isSubscribed) {
      setShowPaywall(true);
      return;
    }
    if (!edited) return;
    const link = document.createElement('a');
    link.href = edited;
    link.download = `aura-optimized-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setOriginal(null);
    setEdited(null);
    setHistory([]);
    setStatus(AppStatus.IDLE);
    setCustomPrompt('');
    setActivePreset(null);
    setErrorMsg(null);
  };

  const renderContent = () => {
    switch (view) {
      case 'how-it-works': return <HowItWorksView />;
      case 'pricing': return <PricingView isSubscribed={isSubscribed} onUpgrade={() => { setIsSubscribed(true); setView('editor'); }} />;
      case 'safety': return <SafetyView />;
      case 'privacy': return <PrivacyView />;
      case 'terms': return <TermsView />;
      default: return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
          {/* Left Column: Image Area */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-[#121212] rounded-3xl border border-white/5 overflow-hidden min-h-[500px] flex items-center justify-center relative shadow-2xl group">
              {!original ? (
                <div 
                  className="flex flex-col items-center gap-4 cursor-pointer p-12 text-center w-full h-full justify-center hover:bg-white/[0.02] transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-2">
                    <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-medium">Upload your photo</h3>
                    <p className="text-gray-500 mt-2 max-w-xs">Upload a clear photo to start optimizing your dating profile presence.</p>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileUpload}
                  />
                </div>
              ) : (
                <div className="w-full h-full relative flex items-center justify-center bg-black/40">
                  {status === AppStatus.EDITING && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-20 flex flex-col items-center justify-center gap-6">
                      <div className="relative">
                        <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-8 h-8 bg-white/10 rounded-full animate-ping"></div>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-white font-semibold text-lg animate-pulse">Refining Your Look</p>
                        <p className="text-white/40 text-sm mt-1">Applying dating science heuristics...</p>
                      </div>
                    </div>
                  )}
                  
                  <img 
                    src={(isComparing ? original.base64 : (edited || original.base64))} 
                    className="max-w-full max-h-[600px] object-contain transition-all duration-500" 
                    alt="Workspace"
                  />

                  {/* Paywall Overlay */}
                  {showPaywall && !isSubscribed && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-30 flex items-center justify-center p-8 text-center animate-in zoom-in-95 duration-200">
                      <div className="max-w-xs flex flex-col items-center bg-[#1a1a1a] p-8 rounded-[2rem] border border-white/10 shadow-2xl">
                        <div className="w-16 h-16 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center text-3xl mb-4 border border-orange-500/20">🔒</div>
                        <h3 className="text-xl font-bold mb-2">Aura Pro Feature</h3>
                        <p className="text-sm text-gray-400 mb-6 leading-relaxed">High-resolution downloads are exclusive to Pro members. Upgrade now to save your optimized photos to your device.</p>
                        <div className="flex flex-col gap-3 w-full">
                          <button 
                            onClick={() => { setShowPaywall(false); setView('pricing'); }}
                            className="bg-orange-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-orange-500/20 hover:scale-[1.02] transition-transform"
                          >
                            Upgrade for $9.99
                          </button>
                          <button 
                            onClick={() => setShowPaywall(false)}
                            className="text-gray-500 text-xs hover:text-white transition-colors py-2"
                          >
                            Maybe later
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Top Action Bar */}
                  <div className="absolute top-4 right-4 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    {edited && (
                      <button 
                        onClick={downloadImage}
                        className={`${isSubscribed ? 'bg-white text-black' : 'bg-orange-500 text-white'} px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:brightness-110 transition-all shadow-lg active:scale-95`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        {isSubscribed ? 'DOWNLOAD 4K' : 'UPGRADE TO DOWNLOAD'}
                      </button>
                    )}
                    <button 
                      onClick={handleReset}
                      className="bg-red-500/20 hover:bg-red-500/40 text-red-300 p-2 rounded-xl transition-colors backdrop-blur-md border border-white/10"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Bottom Comparison Toggle */}
                  {edited && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-2xl z-10 overflow-hidden">
                      <button 
                        onMouseDown={() => setIsComparing(true)}
                        onMouseUp={() => setIsComparing(false)}
                        onTouchStart={() => setIsComparing(true)}
                        onTouchEnd={() => setIsComparing(false)}
                        className="px-6 py-2 rounded-xl text-xs font-bold transition-all bg-white/5 hover:bg-white/10 text-white uppercase tracking-widest active:bg-orange-500 active:text-white"
                      >
                        Hold to Compare Original
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* History / Recent Versions */}
            {history.length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Version History</h3>
                <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setEdited(item.url)}
                      className={`flex-shrink-0 w-24 h-24 rounded-xl border-2 transition-all overflow-hidden ${
                        edited === item.url ? 'border-orange-500 scale-95' : 'border-white/5 hover:border-white/20'
                      }`}
                    >
                      <img src={item.url} className="w-full h-full object-cover" alt="History thumbnail" />
                    </button>
                  ))}
                  <button
                    onClick={() => setEdited(null)}
                    className={`flex-shrink-0 w-24 h-24 rounded-xl border-2 flex flex-col items-center justify-center text-[10px] uppercase font-bold transition-all ${
                      !edited ? 'border-orange-500 bg-orange-500/10' : 'border-white/5 bg-[#121212] hover:border-white/20 text-gray-500'
                    }`}
                  >
                    <span className="text-lg">🖼️</span>
                    Original
                  </button>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-400 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errorMsg}
              </div>
            )}

            {original && status !== AppStatus.EDITING && (
              <div className="bg-[#121212] rounded-2xl border border-white/5 p-4 flex gap-2 focus-within:border-white/20 transition-all shadow-lg">
                <input 
                  type="text" 
                  placeholder="Suggest an edit (e.g. 'Make it look like I'm in a library')"
                  className="flex-1 bg-transparent border-none outline-none px-2 text-sm text-white"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && customPrompt && onEdit(customPrompt)}
                />
                <button 
                  className="bg-gradient-to-tr from-pink-500 to-orange-400 px-6 py-2 rounded-xl text-sm font-bold hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                  onClick={() => onEdit(customPrompt)}
                  disabled={!customPrompt}
                >
                  Apply Edit
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Controls */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span className="text-orange-400">⚡</span> Enhancement Presets
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => onEdit(preset.prompt, preset.id)}
                    disabled={!original || status === AppStatus.EDITING}
                    className={`flex flex-col items-start p-4 rounded-2xl border transition-all text-left group ${
                      activePreset === preset.id 
                        ? 'bg-white/10 border-white/40 ring-1 ring-white/10' 
                        : 'bg-[#121212] border-white/5 hover:border-white/20'
                    } ${(!original || status === AppStatus.EDITING) ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}
                  >
                    <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">{preset.icon}</span>
                    <span className="font-bold text-sm">{preset.label}</span>
                    <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                      {preset.description}
                    </p>
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-[#121212]/50 p-6 rounded-3xl border border-white/5">
              <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-widest">Dating Optimizer Insights</h3>
              <div className="space-y-5">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">Eye Contact & Lighting</h4>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">High-contrast lighting and clear eyes increase matching probability by up to 40%.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-400 flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">Background Matters</h4>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">Busy backgrounds distract from your face. We use AI bokeh to keep the focus on you.</p>
                  </div>
                </div>
              </div>
            </section>

            <div className={`mt-auto p-6 rounded-3xl border relative overflow-hidden transition-all ${
              isSubscribed ? 'bg-green-500/10 border-green-500/20 shadow-lg shadow-green-500/10' : 'bg-gradient-to-br from-pink-500/20 to-orange-400/20 border-pink-500/20'
            }`}>
               <div className="absolute top-0 right-0 p-4 opacity-10">
                  <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
               </div>
               <h4 className="font-black text-lg text-white flex items-center gap-2">
                {isSubscribed ? <><span className="text-green-400">✓</span> Aura Pro Active</> : 'Aura Pro'}
              </h4>
              <p className="text-sm text-gray-300 mt-2 relative z-10">
                {isSubscribed 
                  ? 'You have unlocked unlimited 4K downloads and premium cloud processing.' 
                  : 'Unlock unlimited 4K high-resolution downloads and all background suites.'}
              </p>
              {!isSubscribed && (
                <button 
                  onClick={() => setView('pricing')}
                  className="w-full mt-5 bg-white text-black py-3 rounded-2xl text-sm font-black hover:scale-[1.02] transition-all shadow-xl active:scale-95"
                >
                  UPGRADE FOR $9.99
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <Layout activeView={view} onNavigate={(v) => { setView(v as any); setShowPaywall(false); }}>
      {renderContent()}
    </Layout>
  );
};

export default App;
