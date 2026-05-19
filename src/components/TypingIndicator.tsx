export default function TypingIndicator() {
  return (
    <div className="flex w-full justify-start mb-4">
      <div className="px-4 py-3.5 rounded-2xl rounded-bl-sm bg-white/[0.03] border border-white/[0.05] backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  );
}
