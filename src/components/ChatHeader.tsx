import Link from "next/link";

export default function ChatHeader({ 
  onClear, 
  onResetMemory, 
  statusText,
  tutorMode = false,
  onToggleTutorMode,
  sidebarOpen = false,
  onToggleSidebar
}: { 
  onClear: () => void, 
  onResetMemory?: () => void, 
  statusText?: string,
  tutorMode?: boolean,
  onToggleTutorMode?: () => void,
  sidebarOpen?: boolean,
  onToggleSidebar?: () => void
}) {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[#1c242f]/90 backdrop-blur-md border-b border-[#0f161e] flex items-center justify-between px-4 z-50">
      <div className="flex items-center gap-3">
        <Link href="/" className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white/90 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neutral-600 to-neutral-800 shadow-lg overflow-hidden relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/girl.jpg" alt="Mira" className="w-full h-full object-cover" />
          </div>
          {statusText !== "был(а) недавно" && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#1c242f] rounded-full"></div>
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-white/90 font-medium text-sm">Mira</span>
          <span className={`text-xs ${statusText === "был(а) недавно" ? "text-white/40" : "text-blue-400/90"}`}>
            {statusText || "в сети"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onToggleTutorMode && (
          <button 
            onClick={onToggleTutorMode}
            className={`flex items-center gap-1.5 text-xs transition-all px-3 py-1.5 rounded-lg border cursor-pointer ${
              tutorMode 
                ? "bg-amber-500/10 text-amber-400 border-amber-500/30 font-medium" 
                : "text-white/50 bg-white/5 border-transparent hover:border-white/10 hover:text-white/80"
            }`}
            title="Режим Куратора: редактирование реплик"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${tutorMode ? "bg-amber-400 animate-pulse" : "bg-white/30"}`} />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
            <span className="hidden sm:inline">Куратор</span>
          </button>
        )}
        {onToggleSidebar && (
          <button 
            onClick={onToggleSidebar}
            className={`flex items-center gap-1.5 text-xs transition-all px-3 py-1.5 rounded-lg border cursor-pointer ${
              sidebarOpen 
                ? "bg-blue-500/10 text-blue-400 border-blue-500/30 font-medium" 
                : "text-white/50 bg-white/5 border-transparent hover:border-white/10 hover:text-white/80"
            }`}
            title="Панель отладки и памяти ИИ"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
            <span className="hidden sm:inline">Настройки</span>
          </button>
        )}
        {onResetMemory && (
          <button 
            onClick={onResetMemory}
            className="flex items-center gap-1.5 text-xs text-white/50 hover:text-orange-400 transition-all px-3 py-1.5 rounded-lg bg-white/5 hover:bg-orange-500/10 border border-transparent hover:border-orange-500/20"
            title="Reset Memory"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path>
              <path d="M21 3v5h-5"></path>
            </svg>
            <span className="hidden lg:inline">Reset</span>
          </button>
        )}
        <button 
          onClick={onClear}
          className="flex items-center gap-1.5 text-xs text-white/50 hover:text-rose-400 transition-all px-3 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20"
          title="Clear chat history"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
          </svg>
          <span className="hidden lg:inline">Clear</span>
        </button>
      </div>
    </header>
  );
}
