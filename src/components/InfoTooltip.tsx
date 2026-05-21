"use client";

import { useState } from "react";

export default function InfoTooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);
  
  return (
    <div className="relative inline-flex items-center ml-1.5 group select-none">
      <button 
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onClick={() => setVisible(!visible)}
        className="w-4 h-4 rounded-full bg-white/10 hover:bg-blue-500/20 hover:text-blue-400 text-white/40 flex items-center justify-center text-[10px] font-bold transition-all border border-white/5 cursor-pointer"
      >
        i
      </button>
      {visible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-[#182533]/95 border border-white/10 text-white/90 text-[11px] p-2.5 rounded-xl shadow-xl z-[100] backdrop-blur-md pointer-events-none animate-in fade-in slide-in-from-bottom-1 duration-150 leading-relaxed font-normal normal-case">
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#182533]"></div>
          {text}
        </div>
      )}
    </div>
  );
}
