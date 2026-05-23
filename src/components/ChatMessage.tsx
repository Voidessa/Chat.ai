import { Message } from "@/lib/types";
import { useState, useRef, useEffect, useMemo } from "react";

function VoiceMessagePlayer({ audioUrl, isUser }: { audioUrl: string, isUser: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Generate a random stable waveform for this instance
  const waveform = useMemo(() => {
    const bars = [];
    for (let i = 0; i < 35; i++) {
      let height = 30 + Math.sin(i * 0.5) * 20 + Math.abs(Math.sin(i * 9.8)) * 50;
      if (height < 15) height = 15;
      if (height > 100) height = 100;
      bars.push(height);
    }
    return bars;
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setProgress(audio.currentTime);
    const updateDuration = () => {
      if (audio.duration && audio.duration !== Infinity) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => { setIsPlaying(false); setProgress(0); };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play().catch(e => console.error("Play failed", e));
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time) || time === Infinity) return "00:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration ? (progress / duration) : 0;
  const playBtnBg = isUser ? 'bg-white text-[#2b5278]' : 'bg-[#3390ec] text-white';
  const playedBar = isUser ? 'bg-white' : 'bg-[#3390ec]';
  const unplayedBar = isUser ? 'bg-white/30' : 'bg-[#1c2a38]/40';

  return (
    <div className="flex items-start gap-3 w-[260px] pt-1 pb-1">
      <audio ref={audioRef} src={audioUrl} className="hidden" preload="metadata" />
      <button 
        onClick={togglePlay}
        className={`w-[44px] h-[44px] rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 ${playBtnBg}`}
      >
        {isPlaying ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><path d="M6 4l14 8-14 8z"/></svg>
        )}
      </button>
      
      <div className="flex-1 flex flex-col justify-center mt-1">
        <div className="flex items-end h-[24px] gap-[2px] cursor-pointer" onClick={(e) => {
          if (!audioRef.current || !duration) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const newTime = ((e.clientX - rect.left) / rect.width) * duration;
          audioRef.current.currentTime = newTime;
          setProgress(newTime);
        }}>
          {waveform.map((h, i) => {
            const isPlayed = (i / waveform.length) <= progressPercent;
            return (
              <div 
                key={i} 
                className={`w-[3px] rounded-full transition-colors duration-100 ${isPlayed ? playedBar : unplayedBar}`}
                style={{ height: `${h}%` }}
              />
            );
          })}
        </div>
        <div className={`text-[12px] mt-1.5 font-medium flex items-center gap-1.5 ${isUser ? 'text-[#85a3c2]' : 'text-[#687b8f]'}`}>
          <span>{formatTime(isPlaying ? progress : duration)}</span>
          <span className="w-1 h-1 rounded-full bg-[#3390ec] inline-block opacity-80" />
        </div>
      </div>
    </div>
  );
}

export default function ChatMessage({ 
  message, 
  onFeedback,
  onReply,
  tutorMode = false,
  onEditMessage,
  onDelete,
  onPin,
  isPinned = false,
  onReact
}: { 
  message: Message, 
  onFeedback?: (id: string, fb: "like" | "dislike") => void,
  onReply?: (msg: Message) => void,
  tutorMode?: boolean,
  onEditMessage?: (id: string, newContent: string) => void,
  onDelete?: (id: string) => void,
  onPin?: (msg: Message) => void,
  isPinned?: boolean,
  onReact?: (id: string, reaction: "thumbsup" | "heart" | "laugh" | "sad" | "angry" | "fire" | "clap") => void
}) {
  const isUser = message.role === "user";
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showMenu, setShowMenu] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartRef = useRef<{x: number, y: number, time: number} | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSwipingRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const clientY = e.touches[0].clientY;
    touchStartRef.current = { x: e.touches[0].clientX, y: clientY, time: Date.now() };
    isSwipingRef.current = false;
    
    longPressTimerRef.current = setTimeout(() => {
      if (!isSwipingRef.current) {
        const spaceBelow = window.innerHeight - clientY;
        setOpenUpward(spaceBelow < 280);
        setShowMenu(true);
      }
    }, 450); // 450ms for long press
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    const deltaX = e.touches[0].clientX - touchStartRef.current.x;
    const deltaY = e.touches[0].clientY - touchStartRef.current.y;
    
    // Cancel swipe/longpress on vertical scroll
    if (Math.abs(deltaY) > 15) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      setSwipeOffset(0);
      return;
    }
    
    // Swipe left to reply
    if (deltaX < -5) {
      isSwipingRef.current = true;
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      
      const boundedOffset = Math.max(-65, deltaX);
      setSwipeOffset(boundedOffset);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    
    if (swipeOffset <= -40 && onReply) {
      onReply(message);
    }
    
    setSwipeOffset(0);
    touchStartRef.current = null;
    setTimeout(() => { isSwipingRef.current = false; }, 100);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onReact && !isUser) {
      onReact(message.id, "heart");
    }
  };

  // Format message timestamp in HH:MM format
  const messageTime = useMemo(() => {
    if (!message.createdAt) return "";
    try {
      const date = new Date(message.createdAt);
      return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }, [message.createdAt]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
      .then(() => {
        // Simple visual feedback could go here if needed
      })
      .catch(err => console.error("Failed to copy", err));
    setShowMenu(false);
  };

  const reactionEmojis = {
    thumbsup: "👍",
    heart: "❤️",
    laugh: "😂",
    sad: "😢",
    angry: "😡",
    fire: "🔥",
    clap: "👏"
  };

  const showReactions = message.aiReaction || message.userReaction;

  return (
    <div 
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"} mb-5 relative group overflow-visible`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(e) => {
        e.preventDefault();
        setShowMenu(true);
      }}
    >
      {/* Container that slides when swiped */}
      <div 
        className="flex w-full relative z-10"
        style={{ 
          transform: `translateX(${swipeOffset}px)`, 
          transition: swipeOffset !== 0 ? 'none' : 'transform 0.2s cubic-bezier(0.1, 0.7, 0.1, 1)',
          justifyContent: isUser ? "flex-end" : "flex-start"
        }}
      >
      {/* Background click interceptor for dropdown */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-40 bg-transparent" 
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(false);
          }} 
        />
      )}

      {/* Options Button on Left (for User Messages) */}
      {isUser && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            const spaceBelow = window.innerHeight - e.clientY;
            setOpenUpward(spaceBelow < 280);
            setShowMenu(!showMenu);
          }}
          className={`w-7 h-7 rounded-full bg-[#1c242f]/80 backdrop-blur-sm border border-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-[#2b5278] transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 self-center mr-2 cursor-pointer shadow-md select-none ${showMenu ? 'opacity-100' : ''}`}
          title="Опции"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="12" cy="5" r="1"></circle>
            <circle cx="12" cy="19" r="1"></circle>
          </svg>
        </button>
      )}

      {/* Message Bubble Wrapper */}
      <div 
        className={`max-w-[85%] md:max-w-[65%] px-3.5 py-2 rounded-2xl text-[15px] leading-relaxed shadow-md relative ${
          isUser 
            ? "bg-[#2b5278] text-white rounded-br-sm" 
            : "bg-[#182533] text-white rounded-bl-sm"
        } ${isPinned ? "border-l-4 border-blue-500 bg-[#213244]" : ""}`}
      >
        {/* Pinned label inside bubble */}
        {isPinned && (
          <div className="text-[10px] text-blue-400 font-semibold mb-1 flex items-center gap-1 select-none">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
            </svg>
            <span>Закреплено</span>
          </div>
        )}

        {/* Reply Preview inside bubble */}
        {message.replyTo && (
          <div className="mb-2 pl-2.5 py-1 border-l-[3px] border-[#8774e1] bg-black/15 rounded-r-md text-sm cursor-pointer select-none hover:bg-black/25 transition-colors" onClick={() => {
            const el = document.getElementById(`msg-${message.replyTo?.id}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el?.classList.add('flash-highlight');
            setTimeout(() => el?.classList.remove('flash-highlight'), 1800);
          }}>
            <div className="text-[#8774e1] font-semibold text-[12px] mb-0.5">
              {isUser ? "Mira" : "Вы"}
            </div>
            <div className="text-white/70 truncate text-[12.5px] max-w-[240px]">
              {message.replyTo.content}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex flex-col gap-0.5">
          {message.audioUrl && (
            <div className="mb-1">
              <VoiceMessagePlayer audioUrl={message.audioUrl} isUser={isUser} />
            </div>
          )}

          <div className="flex flex-col">
            {!message.audioUrl && (
              isEditing ? (
                <div className="flex flex-col gap-2 w-full min-w-[200px] sm:min-w-[300px]">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full bg-black/35 border border-white/15 rounded-xl p-2.5 text-white text-[16px] md:text-[14px] focus:outline-none focus:border-blue-500/50 resize-none font-normal leading-normal"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex justify-end gap-2 text-xs">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditContent(message.content);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 transition-colors font-medium cursor-pointer"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={() => {
                        if (onEditMessage && editContent.trim() !== "") {
                          onEditMessage(message.id, editContent.trim());
                        }
                        setIsEditing(false);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors font-medium cursor-pointer"
                    >
                      Сохранить
                    </button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words font-normal">
                  {message.content}
                </p>
              )
            )}

            {/* Timestamp & Status Checkmark nested elegant layout */}
            {!isEditing && (
              <div className="flex items-center gap-1 justify-end ml-auto pt-1 text-[10px] text-white/40 select-none pointer-events-none self-end">
                <span>{messageTime}</span>
                {isUser && (
                  <span className="text-[#64b5f6]">
                    {message.status === 'read' ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="18 6 7 17 2 12"></polyline>
                        <polyline points="22 10 12 20 10.5 18.5"></polyline>
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Reaction badges overlay (Telegram style) */}
        {showReactions && (
          <div 
            onClick={(e) => {
              e.stopPropagation();
              // Clicking the reaction bubble toggles or displays menu
              setShowMenu(true);
            }}
            className={`absolute -bottom-2.5 ${isUser ? 'right-4' : 'left-4'} bg-[#182533] rounded-full px-2 py-0.5 border border-[#0f161e] shadow-md text-[13px] flex items-center gap-1.5 z-10 select-none cursor-pointer hover:scale-105 transition-transform`}
          >
            {message.aiReaction && (
              <span title="Реакция Миры" className="flex items-center">
                {message.aiReaction === 'heart' && '❤️'}
                {message.aiReaction === 'laugh' && '😂'}
                {message.aiReaction === 'sad' && '😢'}
                {message.aiReaction === 'angry' && '😡'}
              </span>
            )}
            {message.userReaction && (
              <span title="Ваша реакция" className="flex items-center border-l border-white/10 pl-1.5 first:border-0 first:pl-0">
                {reactionEmojis[message.userReaction]}
              </span>
            )}
          </div>
        )}

        {/* Telegram Custom Context Menu Dropdown */}
        {showMenu && (
          <div 
            className={`absolute z-50 w-52 bg-[#17212b] border border-white/10 rounded-xl p-1.5 telegram-context-menu text-white select-none shadow-2xl ${
              openUpward 
                ? (isUser ? "right-0 bottom-full mb-2" : "left-0 bottom-full mb-2")
                : (isUser ? "right-0 top-full mt-2" : "left-0 top-full mt-2")
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Quick Reactions Bar at the Top */}
            {onReact && (
              <div className="flex justify-between items-center px-1 pb-1.5 mb-1.5 border-b border-white/5 gap-1 overflow-x-auto">
                {(Object.keys(reactionEmojis) as Array<keyof typeof reactionEmojis>).map((key) => {
                  const emoji = reactionEmojis[key];
                  const isActive = message.userReaction === key;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        onReact(message.id, key);
                        setShowMenu(false);
                      }}
                      className={`text-lg p-1 hover:bg-white/10 rounded-lg transition-all transform active:scale-90 cursor-pointer ${
                        isActive ? "bg-blue-600/30 ring-1 ring-blue-500/40" : ""
                      }`}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Menu Items */}
            <div className="flex flex-col text-xs font-normal">
              {onReply && (
                <button 
                  onClick={() => {
                    onReply(message);
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 17 4 12 9 7"></polyline>
                    <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
                  </svg>
                  <span>Ответить</span>
                </button>
              )}

              <button 
                onClick={handleCopy}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span>Копировать</span>
              </button>

              {onPin && (
                <button 
                  onClick={() => {
                    onPin(message);
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="17" x2="12" y2="22"></line>
                    <path d="M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.78-3.55A2 2 0 0 1 15 9.24V5a3 3 0 0 0-6 0v4.24a2 2 0 0 1-.78 1.21L5.44 14a2 2 0 0 0-.44 1.24V17z"></path>
                  </svg>
                  <span>{isPinned ? "Открепить" : "Закрепить"}</span>
                </button>
              )}

              {(isUser || tutorMode) && !message.audioUrl && onEditMessage && (
                <button 
                  onClick={() => {
                    setEditContent(message.content);
                    setIsEditing(true);
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left cursor-pointer text-amber-400/90 hover:text-amber-300"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                  <span>Изменить</span>
                </button>
              )}

              {/* RLHF Tutor Feedback Inside Dropdown (for assistants) */}
              {!isUser && onFeedback && (
                <>
                  <button 
                    onClick={() => {
                      onFeedback(message.id, "like");
                      setShowMenu(false);
                    }}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left cursor-pointer ${
                      message.feedback === 'like' ? 'text-emerald-400' : 'text-white/70'
                    }`}
                  >
                    <span>👍</span>
                    <span>Отличный ответ (RLHF)</span>
                  </button>
                  <button 
                    onClick={() => {
                      onFeedback(message.id, "dislike");
                      setShowMenu(false);
                    }}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left cursor-pointer ${
                      message.feedback === 'dislike' ? 'text-rose-400 font-medium' : 'text-white/70'
                    }`}
                  >
                    <span>👎</span>
                    <span>Плохой ответ / Переобучить</span>
                  </button>
                </>
              )}

              {/* Delete message choice */}
              {onDelete && (
                <button 
                  onClick={() => {
                    onDelete(message.id);
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition-colors text-left cursor-pointer mt-1 border-t border-white/5 pt-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                  <span>Удалить</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Options Button on Right (for Assistant Messages) */}
      {!isUser && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            const spaceBelow = window.innerHeight - e.clientY;
            setOpenUpward(spaceBelow < 280);
            setShowMenu(!showMenu);
          }}
          className={`w-7 h-7 rounded-full bg-[#1c242f]/80 backdrop-blur-sm border border-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-[#2b5278] transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 self-center ml-2 cursor-pointer shadow-md select-none ${showMenu ? 'opacity-100' : ''}`}
          title="Опции"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="12" cy="5" r="1"></circle>
            <circle cx="12" cy="19" r="1"></circle>
          </svg>
        </button>
      )}

      </div> {/* End of sliding container */}
      
      {/* Reply Icon Background Layer (revealed during swipe) */}
      <div 
        className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-white/90 z-0 transition-opacity"
        style={{ opacity: swipeOffset < -30 ? 1 : 0 }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 17 4 12 9 7"></polyline>
          <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
        </svg>
      </div>

    </div>
  );
}
