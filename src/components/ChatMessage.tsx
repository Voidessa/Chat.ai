import { Message } from "@/lib/types";

export default function ChatMessage({ 
  message, 
  onFeedback,
  onReply 
}: { 
  message: Message, 
  onFeedback?: (id: string, fb: "like" | "dislike") => void,
  onReply?: (msg: Message) => void 
}) {
  const isUser = message.role === "user";
  
  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"} mb-4 relative group`}>
      <div 
        className={`max-w-[85%] md:max-w-[65%] px-3 py-2 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
          isUser 
            ? "bg-[#2b5278] text-white rounded-br-sm" 
            : "bg-[#182533] text-white rounded-bl-sm"
        }`}
      >
        {message.replyTo && (
          <div className="mb-2 pl-2.5 py-1 border-l-[3px] border-[#8774e1] bg-black/10 rounded-r-md text-sm cursor-pointer" onClick={() => {
            const el = document.getElementById(`msg-${message.replyTo?.id}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el?.classList.add('bg-white/10');
            setTimeout(() => el?.classList.remove('bg-white/10'), 1500);
          }}>
            <div className="text-[#8774e1] font-medium text-[13px] mb-0.5">
              {isUser ? "Mira" : "You"}
            </div>
            <div className="text-white/70 truncate text-[13px]">
              {message.replyTo.content}
            </div>
          </div>
        )}
        <div className="flex flex-col gap-1">
          {message.audioUrl ? (
            <audio controls src={message.audioUrl} className="h-10 w-full max-w-[240px] [&::-webkit-media-controls-panel]:bg-white/10 [&::-webkit-media-controls-current-time-display]:text-white/80 [&::-webkit-media-controls-time-remaining-display]:text-white/80" />
          ) : (
            <div className="flex items-end justify-between gap-2">
              <p className="whitespace-pre-wrap break-words font-normal">
                {message.content}
              </p>
              {isUser && (
                <div className="flex-shrink-0 text-white/50 -mb-0.5">
                  {message.status === 'read' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#74b9ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="18 6 7 17 2 12"></polyline>
                      <polyline points="22 10 12 20 10.5 18.5"></polyline>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        {isUser && message.aiReaction && (
          <div className="absolute -bottom-3 right-0 bg-[#182533] rounded-full px-1.5 py-0.5 border border-[#0f161e] shadow-sm text-[14px]">
            {message.aiReaction === 'heart' && '❤️'}
            {message.aiReaction === 'laugh' && '😂'}
            {message.aiReaction === 'sad' && '😢'}
            {message.aiReaction === 'angry' && '😡'}
          </div>
        )}
      </div>

      <div className={`absolute -bottom-7 ${isUser ? "right-2" : "left-2"} opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10 bg-[#1c242f]/90 px-2 py-1.5 rounded-full border border-white/5 backdrop-blur-md shadow-lg`}>
        {onReply && (
          <button 
            onClick={() => onReply(message)}
            className="text-white/60 hover:text-white transition-colors p-1"
            title="Reply"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 17 4 12 9 7"></polyline>
              <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
            </svg>
          </button>
        )}
        {!isUser && onFeedback && (
          <>
            <button 
              onClick={() => onFeedback(message.id, "like")}
              className={`text-[13px] hover:scale-110 transition-transform p-0.5 ${message.feedback === 'like' ? 'opacity-100 grayscale-0' : 'opacity-50 grayscale hover:opacity-100 hover:grayscale-0'}`}
            >
              👍
            </button>
            <button 
              onClick={() => onFeedback(message.id, "dislike")}
              className={`text-[13px] hover:scale-110 transition-transform p-0.5 ${message.feedback === 'dislike' ? 'opacity-100 grayscale-0' : 'opacity-50 grayscale hover:opacity-100 hover:grayscale-0'}`}
            >
              👎
            </button>
          </>
        )}
      </div>
    </div>
  );
}
