// Safety & Ethics Disclaimer
// - Mira is an AI character, not a real person.
// - This MVP avoids NSFW content.
// - The product is for companionship and entertainment, not therapy or emergency support.

import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-800/20 via-neutral-900/5 to-black/80 -z-10"></div>
      
      <div className="z-10 max-w-2xl w-full flex flex-col items-center text-center space-y-12">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-light tracking-tight text-white/90">
            Velora
          </h1>
          <p className="text-lg md:text-xl text-neutral-400 font-light max-w-md mx-auto leading-relaxed">
            She remembers. She notices. She feels closer every time you talk.
          </p>
        </div>

        <div className="w-full max-w-sm rounded-2xl bg-white/[0.02] border border-white/[0.05] p-8 backdrop-blur-sm transition-all duration-500 hover:bg-white/[0.04]">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-900 flex items-center justify-center shadow-2xl border border-white/10 relative overflow-hidden">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,_rgba(255,255,255,0.1),_transparent)]"></div>
             <span className="text-3xl text-white/70 font-light">M</span>
          </div>
          <h2 className="text-2xl font-medium text-white/90 mb-3">Mira</h2>
          <p className="text-neutral-400 text-sm leading-relaxed mb-8">
            An emotionally intelligent AI companion built for warm, private and realistic conversations.
          </p>
          
          <Link 
            href="/chat"
            className="block w-full py-3 px-4 bg-white/10 hover:bg-white/15 text-white/90 rounded-xl transition-all duration-300 font-medium tracking-wide shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_25px_rgba(255,255,255,0.1)] border border-white/10"
          >
            Start talking
          </Link>
        </div>

        <p className="text-xs text-neutral-600 max-w-xs mx-auto">
          AI character. Not a real person. For entertainment and companionship only.
        </p>
      </div>
    </main>
  );
}
