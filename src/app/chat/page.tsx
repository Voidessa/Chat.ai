"use client";

import { useState, useEffect, useRef } from "react";
import ChatHeader from "@/components/ChatHeader";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import TypingIndicator from "@/components/TypingIndicator";
import { Message } from "@/lib/types";
import { generateMockReply } from "@/lib/mockReplies";
import { MiraMemory, defaultMemory, updateMemoryFromUserMessage } from "@/lib/character/miraMemory";
import { MiraRelationship, defaultRelationship, updateRelationshipState } from "@/lib/character/miraRelationship";
import { getProactiveMessage } from "@/lib/character/miraProactive";

// Helper for generating typos
const introduceTypo = (text: string) => {
  const words = text.split(" ");
  if (words.length < 2) return null;
  const targetIdx = words.length - 1; 
  const word = words[targetIdx];
  if (word.length < 4) return null; 
  
  const swapIdx = Math.floor(Math.random() * (word.length - 3)) + 1;
  const typoWord = word.substring(0, swapIdx) + word[swapIdx + 1] + word[swapIdx] + word.substring(swapIdx + 2);
  words[targetIdx] = typoWord;
  
  return {
    textWithTypo: words.join(" "),
    correction: "*" + word.replace(/[^а-яА-ЯёЁa-zA-Z]/g, '')
  };
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [memory, setMemory] = useState<MiraMemory>(defaultMemory);
  const [relationship, setRelationship] = useState<MiraRelationship>(defaultRelationship);
  const [onlineStatus, setOnlineStatus] = useState<"в сети" | "был(а) недавно" | "печатает..." | "записывает голосовое...">("был(а) недавно");
  const [isMounted, setIsMounted] = useState(false);
  const [proactiveCount, setProactiveCount] = useState(0);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  
  // State to lock API fetch while she is already replying
  const [isProcessingReply, setIsProcessingReply] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const proactiveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const offlineTimerRef = useRef<NodeJS.Timeout | null>(null);
  const replyTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Refs for current state to be used inside timeouts
  const messagesRef = useRef(messages);
  const memoryRef = useRef(memory);
  const relationshipRef = useRef(relationship);
  
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { memoryRef.current = memory; }, [memory]);
  useEffect(() => { relationshipRef.current = relationship; }, [relationship]);

  useEffect(() => {
    setIsMounted(true);
    const savedMessages = localStorage.getItem("velora_messages");
    const savedMemory = localStorage.getItem("velora_mira_memory");
    const savedRelationship = localStorage.getItem("velora_mira_relationship");
    
    if (savedMemory) {
      try { setMemory(JSON.parse(savedMemory)); } catch (e) {}
    }
    if (savedRelationship) {
      try { setRelationship(JSON.parse(savedRelationship)); } catch (e) {}
    }

    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {}
    } else {
      const initialMessage: Message = {
        id: "init",
        role: "assistant",
        content: "Привет. Только чур без душных 'как дела' )",
        createdAt: new Date().toISOString()
      };
      setMessages([initialMessage]);
    }
  }, []);

  // Offline timer logic
  useEffect(() => {
    if (offlineTimerRef.current) clearTimeout(offlineTimerRef.current);
    if (onlineStatus === "в сети") {
      offlineTimerRef.current = setTimeout(() => {
        setOnlineStatus("был(а) недавно");
      }, 1000 * 60 * 2); 
    }
    return () => {
      if (offlineTimerRef.current) clearTimeout(offlineTimerRef.current);
    }
  }, [messages, onlineStatus]);

  // Proactive messages logic
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("velora_messages", JSON.stringify(messages));
      localStorage.setItem("velora_mira_memory", JSON.stringify(memory));
      localStorage.setItem("velora_mira_relationship", JSON.stringify(relationship));
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    
    if (proactiveTimerRef.current) clearTimeout(proactiveTimerRef.current);
    
    const lastMsg = messages[messages.length - 1];
    const isTyping = onlineStatus === "печатает..." || onlineStatus === "записывает голосовое...";
    
    if (isMounted && !isTyping && lastMsg?.role === "assistant" && messages.length > 1) {
      if (proactiveCount < 2 && !relationship.userAskedToStop) {
        const baseDelay = 45000 + (proactiveCount * 90000); 
        const delay = baseDelay + Math.random() * 30000;
        proactiveTimerRef.current = setTimeout(() => {
          const pMsg = getProactiveMessage("timeout", relationshipRef.current);
          if (pMsg) {
            setProactiveCount(prev => prev + 1);
            setOnlineStatus("в сети");
            setTimeout(() => {
              setOnlineStatus("печатает...");
              setTimeout(() => {
                const aiReply: Message = {
                  id: Date.now().toString(),
                  role: "assistant",
                  content: pMsg,
                  createdAt: new Date().toISOString()
                };
                setMessages(prev => [...prev, aiReply]);
                setOnlineStatus("в сети");
              }, 1500);
            }, 500);
          }
        }, delay);
      }
    }
    
    return () => {
      if (proactiveTimerRef.current) clearTimeout(proactiveTimerRef.current);
    };
  }, [messages, isMounted, onlineStatus, proactiveCount]);

  const executeAiReply = async () => {
    if (isProcessingReply) return;
    setIsProcessingReply(true);

    const currentMessages = messagesRef.current;
    
    // Start typing
    setOnlineStatus("печатает...");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: currentMessages, 
          memory: memoryRef.current, 
          relationship: relationshipRef.current 
        })
      });

      if (!response.ok) throw new Error("API response not ok");
      const data = await response.json();
      
      if (data.replies && data.replies.length > 0) {
        for (let i = 0; i < data.replies.length; i++) {
          const text = data.replies[i] as string;
          
          // REACTION CHECK
          const reactionMatch = text.match(/\\[REACT_(HEART|LAUGH|SAD|ANGRY)\\]/);
          if (reactionMatch) {
             const reactType = reactionMatch[1].toLowerCase() as "heart" | "laugh" | "sad" | "angry";
             setMessages(prev => {
                const updated = [...prev];
                const lastUser = updated.slice().reverse().find(m => m.role === 'user');
                if (lastUser) {
                  lastUser.aiReaction = reactType;
                }
                return updated;
             });
             continue; 
          }

          // VOICE CHECK 
          const isVoice = Math.random() < 0.1 && text.length > 15 && text.length < 150;
          let audioUrl = "";
          
          if (isVoice) {
            setOnlineStatus("записывает голосовое...");
            try {
              const ttsRes = await fetch("/api/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text })
              });
              if (ttsRes.ok) {
                const blob = await ttsRes.blob();
                audioUrl = URL.createObjectURL(blob);
              }
            } catch (e) {
              console.error("TTS failed", e);
            }
          } else {
            setOnlineStatus("печатает...");
          }

          let typingTime = 1000;
          if (text.length > 100) typingTime = 2500 + Math.random() * 2000;
          else if (text.length > 40) typingTime = 1500 + Math.random() * 1500;
          else typingTime = 800 + Math.random() * 800;
          
          if (i === 0) typingTime = typingTime * 0.5;

          if (!isVoice && Math.random() > 0.8 && text.length > 40) {
            await new Promise(r => setTimeout(r, typingTime * 0.4));
            setOnlineStatus("в сети");
            await new Promise(r => setTimeout(r, 800 + Math.random() * 1500));
            setOnlineStatus("печатает...");
            await new Promise(r => setTimeout(r, typingTime * 0.6));
          } else {
            await new Promise(r => setTimeout(r, Math.max(500, typingTime)));
          }
          
          const typoCheck = (!isVoice && Math.random() < 0.05) ? introduceTypo(text) : null;
          const finalContent = typoCheck ? typoCheck.textWithTypo : text;
          
          setMessages(prev => [...prev, {
            id: Date.now().toString() + i,
            role: "assistant",
            content: finalContent,
            audioUrl: audioUrl || undefined,
            createdAt: new Date().toISOString()
          }]);

          if (typoCheck) {
             setOnlineStatus("печатает...");
             await new Promise(r => setTimeout(r, 800 + Math.random() * 500));
             setMessages(prev => [...prev, {
                id: Date.now().toString() + i + "_corr",
                role: "assistant",
                content: typoCheck.correction,
                createdAt: new Date().toISOString()
             }]);
          }
        }
      }
    } catch (error) {
      console.error("API error", error);
    } finally {
      setOnlineStatus("в сети");
      setIsProcessingReply(false);
      
      // If user sent more messages while she was typing, she will wait and reply to them
      const latestUserMsg = messagesRef.current[messagesRef.current.length - 1];
      if (latestUserMsg && latestUserMsg.role === "user" && latestUserMsg.status === "sent") {
          // Schedule another reply
          if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
          replyTimerRef.current = setTimeout(executeAiReply, 5000 + Math.random() * 10000);
      }
    }
  };

  const handleSend = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
      status: "sent",
      ...(replyToMessage ? { replyTo: { id: replyToMessage.id, content: replyToMessage.content } } : {})
    };
    
    setMessages(prev => [...prev, userMessage]);
    setReplyToMessage(null);
    
    const newMemory = updateMemoryFromUserMessage(memoryRef.current, content);
    setMemory(newMemory);

    const newRelationship = updateRelationshipState(relationshipRef.current, content);
    setRelationship(newRelationship);
    
    if (newRelationship.userAskedToStop || newRelationship.irritation > 70) {
      setProactiveCount(999);
    }

    if (onlineStatus === "был(а) недавно") {
      // Simulate coming online after a short delay
      setTimeout(() => {
         setOnlineStatus("в сети");
      }, 1500 + Math.random() * 2000);
    }

    // Automatically mark the message as "read" after a few seconds if she is not already processing
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === userMessage.id ? { ...m, status: 'read' } : m));
    }, 1500 + Math.random() * 2500);

    if (isProcessingReply) {
       // She is currently replying, let her finish. She will notice the new message when she finishes.
       return;
    }

    if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    
    // 5-10% chance to reply very quickly, 90% chance to wait 15-30 seconds so user can send more
    const isInstant = Math.random() < 0.10; 
    const replyDelay = isInstant ? (2000 + Math.random() * 3000) : (15000 + Math.random() * 15000);
    
    replyTimerRef.current = setTimeout(() => {
      executeAiReply();
    }, replyDelay);
  };

  const handleClear = () => {
    localStorage.removeItem("velora_messages");
    setMessages([]);
  };

  const handleResetMemory = () => {
    localStorage.removeItem("velora_mira_memory");
    localStorage.removeItem("velora_mira_relationship");
    setMemory(defaultMemory);
    setRelationship(defaultRelationship);
    setProactiveCount(0);
  };

  const handleFeedback = (id: string, type: "like" | "dislike") => {
    setMessages(prev => prev.map(m => 
      m.id === id ? { ...m, feedback: m.feedback === type ? undefined : type } : m
    ));
  };

  const handleReply = (msg: Message) => {
    setReplyToMessage(msg);
  };

  if (!isMounted) return null;

  return (
    <div className="flex flex-col h-screen relative bg-[#0e1621]">
      <ChatHeader onClear={handleClear} onResetMemory={handleResetMemory} statusText={onlineStatus} />
      
      <main className="flex-1 overflow-y-auto pt-20 pb-24 px-4 sm:px-6 md:px-8 bg-chat-pattern">
        <div className="max-w-3xl mx-auto flex flex-col justify-end min-h-full">
          <div className="space-y-2 py-4">
            {messages.map((msg) => (
              <div key={msg.id} id={`msg-${msg.id}`} className="transition-colors duration-500 rounded-2xl">
                <ChatMessage message={msg} onFeedback={handleFeedback} onReply={handleReply} />
              </div>
            ))}
            {(onlineStatus === "печатает..." || onlineStatus === "записывает голосовое...") && (
              <div className="animate-in fade-in duration-300">
                <TypingIndicator />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-40">
        <ChatInput 
          onSend={handleSend} 
          disabled={!!relationship.isBlocked} 
          placeholder={relationship.isBlocked ? "Вы заблокированы." : "Написать сообщение..."}
          replyToMessage={replyToMessage}
          onCancelReply={() => setReplyToMessage(null)}
        />
      </div>
    </div>
  );
}
