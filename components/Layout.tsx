
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  onNavigate: (view: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeView, onNavigate }) => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 flex flex-col">
      <header className="border-b border-white/10 py-4 px-6 flex justify-between items-center sticky top-0 bg-[#0a0a0a]/80 backdrop-blur-md z-50">
        <button 
          onClick={() => onNavigate('editor')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 bg-gradient-to-tr from-pink-500 to-orange-400 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-orange-500/20">
            A
          </div>
          <span className="text-xl font-semibold tracking-tight">Aura</span>
        </button>
        <div className="hidden md:flex items-center gap-6 text-sm text-gray-400">
          <button 
            onClick={() => onNavigate('how-it-works')}
            className={`transition-colors hover:text-white ${activeView === 'how-it-works' ? 'text-white font-medium' : ''}`}
          >
            How it works
          </button>
          <button 
            onClick={() => onNavigate('pricing')}
            className={`transition-colors hover:text-white ${activeView === 'pricing' ? 'text-white font-medium' : ''}`}
          >
            Pricing
          </button>
          <button 
            onClick={() => onNavigate('safety')}
            className={`transition-colors hover:text-white ${activeView === 'safety' ? 'text-white font-medium' : ''}`}
          >
            Safety
          </button>
        </div>
        <button 
          onClick={() => onNavigate('editor')}
          className="bg-white text-black px-4 py-1.5 rounded-full text-sm font-bold hover:bg-gray-200 transition-all hover:scale-105 active:scale-95"
        >
          {activeView === 'editor' ? 'Get Started' : 'Start Creating'}
        </button>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="border-t border-white/10 py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
               <div className="w-6 h-6 bg-gradient-to-tr from-pink-500 to-orange-400 rounded flex items-center justify-center font-bold text-white text-[10px]">A</div>
               <span className="font-semibold">Aura AI</span>
            </div>
            <p className="text-sm text-gray-500 max-w-xs">Empowering your dating journey with professional AI photo optimization. Built for the modern matchmaker.</p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Product</h4>
            <ul className="text-sm text-gray-500 space-y-2">
              <li><button onClick={() => onNavigate('how-it-works')} className="hover:text-white">Process</button></li>
              <li><button onClick={() => onNavigate('pricing')} className="hover:text-white">Pricing</button></li>
              <li><button onClick={() => onNavigate('editor')} className="hover:text-white">Editor</button></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Trust</h4>
            <ul className="text-sm text-gray-500 space-y-2">
              <li><button onClick={() => onNavigate('safety')} className="hover:text-white">Safety</button></li>
              <li><button onClick={() => onNavigate('privacy')} className="hover:text-white">Privacy</button></li>
              <li><button onClick={() => onNavigate('terms')} className="hover:text-white">Terms</button></li>
            </ul>
          </div>
        </div>
        <div className="text-center text-xs text-gray-600 pt-8 border-t border-white/5">
          &copy; {new Date().getFullYear()} Aura AI. Optimized for dating profiles. Not affiliated with Match Group.
        </div>
      </footer>
    </div>
  );
};
