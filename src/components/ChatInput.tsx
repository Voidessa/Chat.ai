import { useState, useRef, useEffect } from "react";
import { Message } from "@/lib/types";

export default function ChatInput({ 
  onSend, 
  disabled,
  placeholder = "Message Mira...",
  replyToMessage,
  onCancelReply,
  onFocusChange
}: { 
  onSend: (text: string) => void;
  disabled: boolean;
  placeholder?: string;
  replyToMessage?: Message | null;
  onCancelReply?: () => void;
  onFocusChange?: (focused: boolean) => void;
}) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  useEffect(() => {
    if (!disabled && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 10);
    }
  }, [disabled, replyToMessage]);

  const maxLength = 1000;
  const isTooLong = text.length > maxLength;

  const handleSend = () => {
    if (text.trim() && !disabled && !isTooLong) {
      onSend(text.trim());
      setText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 bg-gradient-to-t from-[#0e1621] to-transparent pb-6 md:pb-8">
      {isTooLong && (
        <div className="max-w-3xl mx-auto mb-2 text-center text-rose-500/80 text-xs font-light">
          Message is too long. Please keep it under 1000 characters.
        </div>
      )}
      <div className={`max-w-3xl mx-auto relative flex flex-col bg-[#1c242f] border ${isTooLong ? 'border-rose-500/50' : 'border-[#0f161e]'} rounded-xl shadow-lg transition-colors`}>
        {replyToMessage && (
          <div className="flex items-center justify-between px-3 pt-2 pb-1 bg-[#1c242f] rounded-t-xl border-b border-white/5">
            <div className="flex flex-col border-l-2 border-[#8774e1] pl-2 flex-1 overflow-hidden">
              <span className="text-[#8774e1] text-[12px] font-medium">{replyToMessage.role === 'user' ? 'You' : 'Mira'}</span>
              <span className="text-white/60 text-[12px] truncate">{replyToMessage.content}</span>
            </div>
            <button onClick={onCancelReply} className="text-white/40 hover:text-white/80 p-1 cursor-pointer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        )}
        <div className="flex items-end gap-2 p-1.5">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => onFocusChange?.(true)}
            onBlur={() => onFocusChange?.(false)}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full bg-transparent text-white/90 placeholder-white/30 resize-none outline-none py-2.5 px-3 max-h-[120px] min-h-[44px] text-[16px] md:text-[15px] font-normal disabled:opacity-50"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={disabled || !text.trim() || isTooLong}
            className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-[#8774e1] text-white mb-1 mr-1 disabled:opacity-30 transition-all hover:bg-[#9785ec] cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"></line>
              <polyline points="5 12 12 5 19 12"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
