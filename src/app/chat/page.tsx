"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ChatHeader from "@/components/ChatHeader";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import TypingIndicator from "@/components/TypingIndicator";
import { Message } from "@/lib/types";
import { MiraMemory, defaultMemory, updateMemoryFromUserMessage } from "@/lib/character/miraMemory";
import { MiraRelationship, defaultRelationship, updateRelationshipState } from "@/lib/character/miraRelationship";
import { updateMiraLifeState } from "@/lib/character/miraLife";
import InfoTooltip from "@/components/InfoTooltip";

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
  type TrainingLog = {
    timestamp: string;
    testerId?: string;
    userGender?: "male" | "female";
    userPrompt: string;
    originalResponse: string;
    correctedResponse: string;
    relationshipState: {
      stage: string;
      trust: number;
      respect: number;
      warmth: number;
      irritation: number;
    };
  };

  const [messages, setMessages] = useState<Message[]>([]);
  const [memory, setMemory] = useState<MiraMemory>(defaultMemory);
  const [relationship, setRelationship] = useState<MiraRelationship>(defaultRelationship);
  const [supportMode, setSupportMode] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState<"в сети" | "был(а) недавно" | "печатает..." | "записывает голосовое...">("был(а) недавно");
  const [isMounted, setIsMounted] = useState(false);
  const [proactiveCount, setProactiveCount] = useState(0);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  
  // Telegram-like custom states
  const [pinnedMessage, setPinnedMessage] = useState<Message | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [deleteForEveryone, setDeleteForEveryone] = useState(true);
  
  // Tutor & Training states
  const [tutorMode, setTutorMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [customRules, setCustomRules] = useState("");
  const [trainingLogs, setTrainingLogs] = useState<TrainingLog[]>([]);
  const [testerId, setTesterId] = useState("");
  const [userGender, setUserGender] = useState<"male" | "female">("male");

  // Feedback states
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbacks, setFeedbacks] = useState<any[]>([]);

  // Ignore / Silence detection refs
  const userIgnoredLastMessageRef = useRef(false);
  const wasIgnoringRef = useRef(false);
  const ignoreDetectionTimerRef = useRef<NodeJS.Timeout | null>(null);

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
  const customRulesRef = useRef(customRules);
  const userGenderRef = useRef(userGender);
  const testerIdRef = useRef(testerId);
  const supportModeRef = useRef(supportMode);
  
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { memoryRef.current = memory; }, [memory]);
  useEffect(() => { relationshipRef.current = relationship; }, [relationship]);
  useEffect(() => { customRulesRef.current = customRules; }, [customRules]);
  useEffect(() => { userGenderRef.current = userGender; }, [userGender]);
  useEffect(() => { testerIdRef.current = testerId; }, [testerId]);
  useEffect(() => { supportModeRef.current = supportMode; }, [supportMode]);

  useEffect(() => {
    setTimeout(() => {
      setIsMounted(true);
      const savedMessages = localStorage.getItem("velora_messages");
      const savedMemory = localStorage.getItem("velora_mira_memory");
      const savedRelationship = localStorage.getItem("velora_mira_relationship");
      
      const savedGender = localStorage.getItem("velora_user_gender");
      if (savedGender === "female") {
        setUserGender("female");
      } else {
        setUserGender("male");
      }

      let savedTesterId = localStorage.getItem("velora_tester_id");
      if (!savedTesterId) {
        savedTesterId = "tester_" + Math.random().toString(36).substring(2, 6).toUpperCase();
        localStorage.setItem("velora_tester_id", savedTesterId);
      }
      setTesterId(savedTesterId);

      const savedTutorMode = localStorage.getItem("velora_tutor_mode");
      if (savedTutorMode === "true") setTutorMode(true);

      const savedSupportMode = localStorage.getItem("velora_support_mode");
      if (savedSupportMode === "true") setSupportMode(true);
      
      const savedRules = localStorage.getItem("velora_custom_rules");
      if (savedRules) setCustomRules(savedRules);
      
      const savedLogs = localStorage.getItem("velora_training_logs");
      if (savedLogs) {
        try { setTrainingLogs(JSON.parse(savedLogs)); } catch { }
      }

      let parsedMemory: MiraMemory = defaultMemory;
      if (savedMemory) {
        try { parsedMemory = JSON.parse(savedMemory); } catch { }
      }
      const updatedLife = updateMiraLifeState(
        parsedMemory.cycleSeedDay,
        parsedMemory.currentEvent,
        parsedMemory.lastEventCheckDate
      );
      parsedMemory.cycleSeedDay = updatedLife.cycleSeedDay;
      parsedMemory.currentEvent = updatedLife.currentEvent;
      parsedMemory.lastEventCheckDate = updatedLife.lastEventCheckDate;
      setMemory(parsedMemory);
      if (savedRelationship) {
        try { setRelationship(JSON.parse(savedRelationship)); } catch { }
      }

      if (savedMessages) {
        try {
          setMessages(JSON.parse(savedMessages));
        } catch { }
      } else {
        const initialMessage: Message = {
          id: "init",
          role: "assistant",
          content: "Привет. Только чур без душных 'как дела' )",
          createdAt: new Date().toISOString()
        };
        setMessages([initialMessage]);
      }

      const savedPinned = localStorage.getItem("velora_pinned_message");
      if (savedPinned) {
        try { setPinnedMessage(JSON.parse(savedPinned)); } catch { }
      }
    }, 0);
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

  // Ignore / Silence detection logic
  useEffect(() => {
    if (ignoreDetectionTimerRef.current) clearTimeout(ignoreDetectionTimerRef.current);
    
    const lastMsg = messages[messages.length - 1];
    if (isMounted && lastMsg && lastMsg.role === "assistant") {
      ignoreDetectionTimerRef.current = setTimeout(() => {
        userIgnoredLastMessageRef.current = true;
      }, 60000); // 1 minute of silence counts as ignoring
    } else {
      userIgnoredLastMessageRef.current = false;
    }
    
    return () => {
      if (ignoreDetectionTimerRef.current) clearTimeout(ignoreDetectionTimerRef.current);
    };
  }, [messages, isMounted]);

  // Synchronize full chat history to the server automatically in real-time
  useEffect(() => {
    if (isMounted && messages.length > 0) {
      const controller = new AbortController();
      const runSync = async () => {
        try {
          await fetch("/api/chat/log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              testerId,
              userGender,
              messages,
              memory,
              relationship
            }),
            signal: controller.signal
          });
        } catch (e) {
          // Fail silently
        }
      };
      const timer = setTimeout(runSync, 1500);
      return () => {
        clearTimeout(timer);
        controller.abort();
      };
    }
  }, [messages, memory, relationship, testerId, userGender, isMounted]);

  const executeProactiveAiReply = useCallback(async () => {
    if (isProcessingReply) return;
    setIsProcessingReply(true);

    const currentMessages = messagesRef.current;
    
    // Switch to online first
    setOnlineStatus("в сети");
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: currentMessages, 
          memory: memoryRef.current, 
          relationship: relationshipRef.current,
          customRules: customRulesRef.current,
          userGender: userGenderRef.current,
          supportMode: supportModeRef.current,
          userLocalTime: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
          userLocalHour: new Date().getHours(),
          isProactive: true,
          userIgnoredLastMessage: wasIgnoringRef.current || userIgnoredLastMessageRef.current
        })
      });

      if (!response.ok) throw new Error("API response not ok");
      const data = await response.json();
      
      // Merge Dynamic Memory Facts & Emotional Notes
      if (data.newFacts && data.newFacts.length > 0) {
        setMemory(prev => {
          const updatedFacts = [...prev.knownFacts];
          data.newFacts.forEach((fact: string) => {
            if (!updatedFacts.includes(fact) && updatedFacts.length < 30) {
              updatedFacts.push(fact);
            }
          });
          return { ...prev, knownFacts: updatedFacts };
        });
      }
      if (data.newEmotionalNotes && data.newEmotionalNotes.length > 0) {
        setMemory(prev => {
          const updatedNotes = [...prev.emotionalNotes];
          data.newEmotionalNotes.forEach((note: string) => {
            if (!updatedNotes.includes(note) && updatedNotes.length < 30) {
              updatedNotes.push(note);
            }
          });
          return { ...prev, emotionalNotes: updatedNotes };
        });
      }

      if (data.relationshipSummary !== undefined) {
        setMemory(prev => ({
          ...prev,
          relationshipSummary: data.relationshipSummary,
          lastInteractionStatus: data.lastInteractionStatus
        }));
      }

      if (data.replies && data.replies.length > 0) {
        for (let i = 0; i < data.replies.length; i++) {
          const text = data.replies[i] as string;
          
          setOnlineStatus("печатает...");
          let typingTime = 1000;
          if (text.length > 100) typingTime = 2500 + Math.random() * 2000;
          else if (text.length > 40) typingTime = 1500 + Math.random() * 1500;
          else typingTime = 800 + Math.random() * 800;

          await new Promise(r => setTimeout(r, typingTime));
          
          setMessages(prev => [...prev, {
            id: Date.now().toString() + "_" + i + "_proactive",
            role: "assistant",
            content: text,
            createdAt: new Date().toISOString()
          }]);
        }
        setProactiveCount(prev => prev + 1);
      }
    } catch (error) {
      console.error("Proactive API error", error);
    } finally {
      setOnlineStatus("был(а) недавно");
      setIsProcessingReply(false);
      
      // Reset ignore markers
      wasIgnoringRef.current = false;
      userIgnoredLastMessageRef.current = false;
    }
  }, [isProcessingReply]);

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
      const isWarmEnough = relationship.warmth >= 25 && relationship.respect >= 30 && relationship.irritation <= 30;
      if (proactiveCount < 1 && isWarmEnough && !relationship.userAskedToStop) {
        const warmthFactor = Math.max(0, Math.min(100, relationship.warmth));
        const baseDelay = 45000 + (100 - warmthFactor) * 2500; 
        const delay = baseDelay + Math.random() * 20000;
        proactiveTimerRef.current = setTimeout(() => {
          executeProactiveAiReply();
        }, delay);
      }
    }
    
    return () => {
      if (proactiveTimerRef.current) clearTimeout(proactiveTimerRef.current);
    };
  }, [messages, isMounted, onlineStatus, proactiveCount, memory, relationship, executeProactiveAiReply]);

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
          relationship: relationshipRef.current,
          customRules: customRulesRef.current,
          userGender: userGenderRef.current,
          supportMode: supportModeRef.current,
          userLocalTime: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
          userLocalHour: new Date().getHours(),
          userIgnoredLastMessage: wasIgnoringRef.current || userIgnoredLastMessageRef.current
        })
      });

      if (!response.ok) throw new Error("API response not ok");
      const data = await response.json();

      // Merge Dynamic Memory Facts & Emotional Notes
      if (data.newFacts && data.newFacts.length > 0) {
        setMemory(prev => {
          const updatedFacts = [...prev.knownFacts];
          data.newFacts.forEach((fact: string) => {
            if (!updatedFacts.includes(fact) && updatedFacts.length < 30) {
              updatedFacts.push(fact);
            }
          });
          return { ...prev, knownFacts: updatedFacts };
        });
      }
      if (data.newEmotionalNotes && data.newEmotionalNotes.length > 0) {
        setMemory(prev => {
          const updatedNotes = [...prev.emotionalNotes];
          data.newEmotionalNotes.forEach((note: string) => {
            if (!updatedNotes.includes(note) && updatedNotes.length < 30) {
              updatedNotes.push(note);
            }
          });
          return { ...prev, emotionalNotes: updatedNotes };
        });
      }
      
      if (data.relationshipSummary !== undefined) {
        setMemory(prev => ({
          ...prev,
          relationshipSummary: data.relationshipSummary,
          lastInteractionStatus: data.lastInteractionStatus
        }));
      }
      
      if (data.replies && data.replies.length > 0) {
        for (let i = 0; i < data.replies.length; i++) {
          const text = data.replies[i] as string;
          
          // REACTION CHECK
          const reactionMatch = text.match(/\[REACT_(HEART|LAUGH|SAD|ANGRY)\]/i);
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
          const lastUserMsg = currentMessages.slice().reverse().find(m => m.role === 'user');
          const userAskedForVoice = lastUserMsg && lastUserMsg.content.toLowerCase().includes('голос');
          const isVoice = userAskedForVoice || (Math.random() < 0.1 && text.length > 15 && text.length < 150);
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

          let typingTime = 500;
          if (text.length > 100) typingTime = 1800 + Math.random() * 1500;
          else if (text.length > 40) typingTime = 1000 + Math.random() * 1000;
          else typingTime = 500 + Math.random() * 600;
          
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
          
          const shouldQuote = (i === 0 && lastUserMsg && Math.random() < 0.20); // 20% chance to quote reply

          setMessages(prev => [...prev, {
            id: Date.now().toString() + i,
            role: "assistant",
            content: finalContent,
            audioUrl: audioUrl || undefined,
            createdAt: new Date().toISOString(),
            ...(shouldQuote ? { replyTo: { id: lastUserMsg.id, content: lastUserMsg.content } } : {})
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
      
      // Reset ignore markers
      wasIgnoringRef.current = false;
      userIgnoredLastMessageRef.current = false;
      
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
    // Capture user ignore status before sending the new message
    wasIgnoringRef.current = userIgnoredLastMessageRef.current;

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

    const newRelationship = updateRelationshipState(relationshipRef.current, content, wasIgnoringRef.current, newMemory.messageCount);
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
    
    // Динамическое время ответа: чаще быстро, но иногда с задержками
    const randDelay = Math.random();
    let replyDelay;
    if (randDelay < 0.60) {
      // 60% chance to reply very quickly (1.5s to 4s)
      replyDelay = 1500 + Math.random() * 2500;
    } else if (randDelay < 0.85) {
      // 25% chance to reply normally (4.5s to 8s)
      replyDelay = 4500 + Math.random() * 3500;
    } else {
      // 15% chance to wait a bit longer (9s to 15s)
      replyDelay = 9000 + Math.random() * 6000;
    }
    
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

  const handleEditMessage = (id: string, newContent: string) => {
    const msgToEdit = messages.find(m => m.id === id);
    if (!msgToEdit) return;

    // Find preceding user message if any
    const msgIndex = messages.findIndex(m => m.id === id);
    let userMsg = "";
    if (msgIndex > 0) {
      const precedingMsg = messages[msgIndex - 1];
      if (precedingMsg.role === "user") {
        userMsg = precedingMsg.content;
      }
    }

    const newLog: TrainingLog = {
      timestamp: new Date().toISOString(),
      testerId: testerId,
      userGender: userGender,
      userPrompt: userMsg,
      originalResponse: msgToEdit.content,
      correctedResponse: newContent,
      relationshipState: {
        stage: relationship.stage,
        trust: relationship.trust,
        respect: relationship.respect,
        warmth: relationship.warmth,
        irritation: relationship.irritation
      }
    };

    const updatedLogs = [...trainingLogs, newLog];
    setTrainingLogs(updatedLogs);
    localStorage.setItem("velora_training_logs", JSON.stringify(updatedLogs));

    // Send logs to server automatically
    fetch("/api/tutor/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newLog)
    }).catch(err => {
      console.warn("Failed to automatically sync log entry to server:", err);
    });

    // Update the message in state
    const updatedMessages = messages.map(m => m.id === id ? { ...m, content: newContent } : m);
    setMessages(updatedMessages);
    localStorage.setItem("velora_messages", JSON.stringify(updatedMessages));
  };

  const handleExportLogs = () => {
    if (trainingLogs.length === 0) {
      alert("Журнал правок пуст. Исправьте ответы Миры в Режиме Куратора, чтобы наполнить лог.");
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(trainingLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `mira_training_log_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportChatHistory = () => {
    if (messages.length === 0) {
      alert("История чата пуста.");
      return;
    }
    const fullLog = {
      testerId: testerId,
      userGender: userGender,
      supportMode: supportMode,
      exportedAt: new Date().toISOString(),
      relationship: {
        stage: relationship.stage,
        trust: relationship.trust,
        respect: relationship.respect,
        warmth: relationship.warmth,
        irritation: relationship.irritation
      },
      memory: {
        knownFacts: memory.knownFacts,
        emotionalNotes: memory.emotionalNotes,
        relationshipSummary: memory.relationshipSummary,
        lastInteractionStatus: memory.lastInteractionStatus
      },
      messages: messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
        replyTo: msg.replyTo,
        userReaction: msg.userReaction,
        aiReaction: msg.aiReaction,
        audioUrl: msg.audioUrl ? "Voice Message (TTS)" : undefined
      }))
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullLog, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `chat_history_${testerId || "tester"}_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const loadFeedbacks = useCallback(async () => {
    try {
      const response = await fetch("/api/feedback");
      if (response.ok) {
        const data = await response.json();
        setFeedbacks(data);
      }
    } catch (e) {
      console.error("Failed to load feedbacks", e);
    }
  }, []);

  useEffect(() => {
    if (sidebarOpen) {
      loadFeedbacks();
    }
  }, [sidebarOpen, loadFeedbacks]);

  const handleSendFeedback = async () => {
    if (!feedbackMessage.trim()) return;
    setIsSendingFeedback(true);
    setFeedbackError("");
    setFeedbackSuccess(false);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: feedbackMessage,
          user: testerId || "anonymous",
          gender: userGender,
          userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "unknown"
        })
      });

      if (!response.ok) throw new Error("Failed to send feedback");

      setFeedbackSuccess(true);
      setFeedbackMessage("");
      loadFeedbacks();
      setTimeout(() => {
        setFeedbackOpen(false);
        setFeedbackSuccess(false);
      }, 2000);
    } catch (err) {
      setFeedbackError("Не удалось отправить отзыв. Пожалуйста, попробуйте еще раз.");
      console.error(err);
    } finally {
      setIsSendingFeedback(false);
    }
  };

  const handleExportFeedback = () => {
    if (feedbacks.length === 0) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(feedbacks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `project_feedback_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleReply = (msg: Message) => {
    setReplyToMessage(msg);
  };

  const handlePinMessage = (msg: Message) => {
    if (pinnedMessage?.id === msg.id) {
      setPinnedMessage(null);
      localStorage.removeItem("velora_pinned_message");
    } else {
      setPinnedMessage(msg);
      localStorage.setItem("velora_pinned_message", JSON.stringify(msg));
    }
  };

  const handleUnpinMessage = () => {
    setPinnedMessage(null);
    localStorage.removeItem("velora_pinned_message");
  };

  const handleReactMessage = (id: string, reaction: "thumbsup" | "heart" | "laugh" | "sad" | "angry" | "fire" | "clap") => {
    setMessages(prev => {
      const updated = prev.map(m => 
        m.id === id ? { ...m, userReaction: m.userReaction === reaction ? undefined : reaction } : m
      );
      localStorage.setItem("velora_messages", JSON.stringify(updated));
      return updated;
    });
  };

  const handleOpenDeleteModal = (id: string) => {
    const msg = messages.find(m => m.id === id);
    if (msg) {
      setMessageToDelete(msg);
      setDeleteModalOpen(true);
      setDeleteForEveryone(true);
    }
  };

  const triggerDeletionReaction = async (deletedMsg: Message) => {
    if (isProcessingReply) return;
    setIsProcessingReply(true);
    setOnlineStatus("в сети");
    
    // Simulate delay before she notices the deletion
    await new Promise(r => setTimeout(r, 1500 + Math.random() * 1500));
    setOnlineStatus("печатает...");

    try {
      const currentMessages = messagesRef.current;
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: currentMessages, 
          memory: memoryRef.current, 
          relationship: relationshipRef.current,
          customRules: customRulesRef.current,
          userGender: userGenderRef.current,
          userLocalTime: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
          userLocalHour: new Date().getHours(),
          deletedMessage: {
            content: deletedMsg.content,
            role: deletedMsg.role,
            id: deletedMsg.id
          }
        })
      });

      if (!response.ok) throw new Error("API response not ok");
      const data = await response.json();
      
      // Update memory & relationship if updated by API
      if (data.newFacts && data.newFacts.length > 0) {
        setMemory(prev => {
          const updatedFacts = [...prev.knownFacts];
          data.newFacts.forEach((fact: string) => {
            if (!updatedFacts.includes(fact) && updatedFacts.length < 30) {
              updatedFacts.push(fact);
            }
          });
          return { ...prev, knownFacts: updatedFacts };
        });
      }
      if (data.newEmotionalNotes && data.newEmotionalNotes.length > 0) {
        setMemory(prev => {
          const updatedNotes = [...prev.emotionalNotes];
          data.newEmotionalNotes.forEach((note: string) => {
            if (!updatedNotes.includes(note) && updatedNotes.length < 30) {
              updatedNotes.push(note);
            }
          });
          return { ...prev, emotionalNotes: updatedNotes };
        });
      }
      if (data.relationshipSummary !== undefined) {
        setMemory(prev => ({
          ...prev,
          relationshipSummary: data.relationshipSummary,
          lastInteractionStatus: data.lastInteractionStatus
        }));
      }

      if (data.replies && data.replies.length > 0) {
        for (let i = 0; i < data.replies.length; i++) {
          let text = data.replies[i] as string;
          const shouldDeleteLastMsg = text.includes("[DELETE_MY_LAST_MESSAGE]");
          if (shouldDeleteLastMsg) {
            text = text.replace("[DELETE_MY_LAST_MESSAGE]", "").trim();
          }

          if (text) {
            setOnlineStatus("печатает...");
            let typingTime = 1200 + Math.random() * 1500;
            await new Promise(r => setTimeout(r, typingTime));

            setMessages(prev => [...prev, {
              id: Date.now().toString() + "_" + i + "_deleted_reaction",
              role: "assistant",
              content: text,
              createdAt: new Date().toISOString()
            }]);
          }

          if (shouldDeleteLastMsg) {
            setTimeout(() => {
              setMessages(prev => {
                const updated = [...prev];
                const lastAssistantIdx = updated.slice().reverse().findIndex(m => m.role === 'assistant' && !m.id.endsWith("_deleted_reaction"));
                if (lastAssistantIdx !== -1) {
                  const actualIdx = updated.length - 1 - lastAssistantIdx;
                  updated.splice(actualIdx, 1);
                }
                return updated;
              });
            }, 1000);
          }
        }
      }
    } catch (e) {
      console.error("Failed to execute deletion reaction", e);
    } finally {
      setOnlineStatus("был(а) недавно");
      setIsProcessingReply(false);
    }
  };

  const confirmDeleteMessage = async (id: string, deleteAlsoForMira: boolean) => {
    setDeleteModalOpen(false);
    setMessageToDelete(null);

    const targetMsg = messages.find(m => m.id === id);
    if (!targetMsg) return;

    const updated = messages.filter(m => m.id !== id);
    setMessages(updated);
    localStorage.setItem("velora_messages", JSON.stringify(updated));

    if (pinnedMessage?.id === id) {
      handleUnpinMessage();
    }

    if (deleteAlsoForMira) {
      await triggerDeletionReaction(targetMsg);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="flex h-[100dvh] relative bg-[#0e1621] overflow-hidden select-none">
      {/* Main chat layout */}
      <div className={`flex-1 flex flex-col h-full transition-all duration-300 relative ${sidebarOpen ? "lg:mr-80" : ""}`}>
        <ChatHeader 
          onClear={handleClear} 
          onResetMemory={handleResetMemory} 
          statusText={onlineStatus}
          tutorMode={tutorMode}
          onToggleTutorMode={() => {
            const next = !tutorMode;
            setTutorMode(next);
            localStorage.setItem("velora_tutor_mode", next ? "true" : "false");
          }}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Telegram-style Pinned Message Bar */}
        {pinnedMessage && (
          <div className="absolute top-16 left-0 right-0 h-12 bg-[#17212b]/95 backdrop-blur-md border-b border-[#0f161e] z-30 flex items-center justify-between px-6 shadow-md transition-all duration-200">
            <div 
              className="flex items-center gap-3 cursor-pointer overflow-hidden flex-1"
              onClick={() => {
                const el = document.getElementById(`msg-${pinnedMessage.id}`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el?.classList.add('flash-highlight');
                setTimeout(() => el?.classList.remove('flash-highlight'), 1800);
              }}
            >
              <span className="text-[#5288c1] shrink-0">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                </svg>
              </span>
              <div className="flex flex-col text-left truncate">
                <span className="text-[#5288c1] text-[11px] font-bold tracking-wide uppercase">Закрепленное сообщение</span>
                <span className="text-white/70 text-[13px] truncate">
                  {pinnedMessage.audioUrl ? "🎤 Голосовое сообщение" : pinnedMessage.content}
                </span>
              </div>
            </div>
            <button 
              onClick={handleUnpinMessage}
              className="text-white/40 hover:text-white/80 transition-colors p-1.5 cursor-pointer"
              title="Открепить"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        )}
        
        <main className={`flex-1 overflow-y-auto ${pinnedMessage ? "pt-28" : "pt-20"} pb-24 px-4 sm:px-6 md:px-8 bg-chat-pattern`}>
          <div className="max-w-3xl mx-auto flex flex-col justify-end min-h-full">
            <div className="space-y-2 py-4">
              {messages.map((msg) => (
                <div key={msg.id} id={`msg-${msg.id}`} className="transition-colors duration-500 rounded-2xl">
                  <ChatMessage 
                    message={msg} 
                    onFeedback={handleFeedback} 
                    onReply={handleReply} 
                    tutorMode={tutorMode}
                    onEditMessage={handleEditMessage}
                    onDelete={handleOpenDeleteModal}
                    onPin={handlePinMessage}
                    isPinned={pinnedMessage?.id === msg.id}
                    onReact={handleReactMessage}
                  />
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

        <div className={`fixed bottom-0 left-0 z-40 transition-all duration-300 ${sidebarOpen ? "lg:right-80" : "right-0"}`}>
          <ChatInput 
            onSend={handleSend} 
            disabled={!!relationship.isBlocked} 
            placeholder={relationship.isBlocked ? "Вы заблокированы." : "Написать сообщение..."}
            replyToMessage={replyToMessage}
            onCancelReply={() => setReplyToMessage(null)}
            onFocusChange={(focused) => setIsInputFocused(focused)}
          />
        </div>
      </div>

      {/* Tutor Panel Sidebar */}
      {sidebarOpen && (
        <div className="fixed top-0 right-0 bottom-0 w-full sm:w-80 bg-[#17212b] border-l border-[#101921] z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-250">
          {/* Header */}
          <div className="h-16 px-4 border-b border-[#101921] flex items-center justify-between">
            <h3 className="text-white font-medium text-sm">Панель куратора ИИ</h3>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Tester Identification */}
            <div className="bg-[#24303f]/50 border border-white/5 p-3.5 rounded-xl space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold flex items-center">
                <span>ID куратора</span>
                <InfoTooltip text="Ваш уникальный идентификатор. Все ваши правки сохраняются в отдельный файл с этим именем на сервере." />
              </div>
              <input 
                type="text"
                value={testerId}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^a-zA-Z0-9_\-]/g, "_");
                  setTesterId(val);
                  localStorage.setItem("velora_tester_id", val);
                }}
                className="w-full bg-[#1c2a38] border border-white/10 rounded-lg px-3 py-1.5 text-white text-[16px] md:text-xs focus:outline-none focus:border-blue-500/50 font-normal"
                placeholder="Например: Masha или tester_1"
              />
            </div>

            {/* Gender Toggle */}
            <div className="bg-[#24303f]/50 border border-white/5 p-3.5 rounded-xl space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold flex items-center">
                <span>Пол собеседника</span>
                <InfoTooltip text="Влияет на окончания слов и отношение Миры. С мужчиной она флиртует, с женщиной общается как подружка." />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setUserGender("male");
                    localStorage.setItem("velora_user_gender", "male");
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                    userGender === "male" 
                      ? "bg-blue-600/20 text-blue-400 border-blue-500/30" 
                      : "bg-black/20 text-neutral-500 border-transparent hover:text-neutral-400"
                  }`}
                >
                  Мужчина
                </button>
                <button
                  onClick={() => {
                    setUserGender("female");
                    localStorage.setItem("velora_user_gender", "female");
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                    userGender === "female" 
                      ? "bg-rose-600/20 text-rose-400 border-rose-500/30" 
                      : "bg-black/20 text-neutral-500 border-transparent hover:text-neutral-400"
                  }`}
                >
                  Женщина
                </button>
              </div>
            </div>

            {/* Support/Friend Mode Toggle */}
            <div className="bg-[#24303f]/50 border border-white/5 p-3.5 rounded-xl space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold flex items-center">
                <span>Режим «Подруга-Помощница»</span>
                <InfoTooltip text="Включает режим эмпатичной поддержки. Мира будет мягче, станет чутко выслушивать, деликатно интересоваться вашим состоянием и помогать решать проблемы." />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSupportMode(false);
                    localStorage.setItem("velora_support_mode", "false");
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                    !supportMode 
                      ? "bg-blue-600/20 text-blue-400 border-blue-500/30" 
                      : "bg-black/20 text-neutral-500 border-transparent hover:text-neutral-400"
                  }`}
                >
                  Обычный
                </button>
                <button
                  onClick={() => {
                    setSupportMode(true);
                    localStorage.setItem("velora_support_mode", "true");
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                    supportMode 
                      ? "bg-[#f43f5e]/20 text-[#f43f5e] border-[#f43f5e]/30" 
                      : "bg-black/20 text-neutral-500 border-transparent hover:text-neutral-400"
                  }`}
                >
                  Подруга
                </button>
              </div>
            </div>

            {/* Stage Info */}
            <div className="bg-[#24303f]/50 border border-white/5 p-3.5 rounded-xl space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold flex items-center">
                <span>Стадия отношений</span>
                <InfoTooltip text="Этап развития общения: от незнакомцев (Stranger) до близких друзей. Меняется автоматически на основе уровня доверия и уважения ИИ к вам." />
              </div>
              <div className="text-white font-medium text-sm">
                {relationship.stage}
              </div>
            </div>

            {/* Metrics */}
            <div className="space-y-3 bg-[#24303f]/30 border border-white/5 p-3.5 rounded-xl">
              <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold mb-2 flex items-center">
                <span>Параметры эмоций</span>
                <InfoTooltip text="Эмоциональный статус Миры. Доверие и теплота делают её мягкой, раздражение заставляет грубить, а неуважение — игнорировать или отвечать холодно." />
              </div>
              {[
                { label: "Доверие (Trust)", val: relationship.trust, key: "trust" },
                { label: "Уважение (Respect)", val: relationship.respect, key: "respect" },
                { label: "Теплота (Warmth)", val: relationship.warmth, key: "warmth" },
                { label: "Раздражение (Irritation)", val: relationship.irritation, key: "irritation" }
              ].map(metric => (
                <div key={metric.key} className="space-y-1">
                  <div className="flex justify-between text-xs text-white/70">
                    <span>{metric.label}</span>
                    <span className="font-semibold text-blue-400">{metric.val}/100</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={metric.val}
                    onChange={(e) => {
                      const newVal = parseInt(e.target.value);
                      setRelationship(prev => {
                        const updated = { ...prev, [metric.key]: newVal };
                        localStorage.setItem("velora_mira_relationship", JSON.stringify(updated));
                        return updated;
                      });
                    }}
                    className="w-full accent-blue-500 h-1.5 bg-black/30 rounded-lg cursor-pointer appearance-none"
                  />
                </div>
              ))}
            </div>

            {/* User Dossier */}
            <div className="bg-[#24303f]/50 border border-white/5 p-3.5 rounded-xl space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold flex items-center">
                <span>Досье ИИ на собеседника</span>
                <InfoTooltip text="Краткое резюме отношений и статус последнего разговора, которые Мира сама обновляет в своей памяти после каждого сообщения." />
              </div>
              <div className="space-y-1.5 font-normal">
                <div className="text-xs text-white/90 leading-normal">
                  <span className="text-neutral-400">Резюме:</span>{" "}
                  {memory.relationshipSummary || <span className="text-neutral-500 italic">еще не сформировано</span>}
                </div>
                {memory.lastInteractionStatus && (
                  <div className="text-[11px] text-blue-400">
                    <span className="text-neutral-400">Статус:</span>{" "}
                    <span className="font-semibold">{memory.lastInteractionStatus}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Known Facts (Memory) */}
            <div className="space-y-3.5 bg-[#24303f]/30 border border-white/5 p-3.5 rounded-xl">
              <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold flex items-center">
                <span>Содержимое памяти ({memory.knownFacts.length})</span>
                <InfoTooltip text="Факты, которые Мира запомнила о вас из чата. Нажмите '×' рядом с фактом, чтобы удалить его, если ИИ запомнил что-то неверно." />
              </div>
              {memory.knownFacts.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                  {memory.knownFacts.map((fact, idx) => (
                    <span 
                      key={idx}
                      className="px-2 py-1 rounded bg-[#1c2a38] text-white/80 border border-white/5 text-[11px] flex items-center gap-1.5 animate-in fade-in"
                    >
                      {fact}
                      <button 
                        onClick={() => {
                          setMemory(prev => {
                            const updated = { ...prev, knownFacts: prev.knownFacts.filter((_, i) => i !== idx) };
                            localStorage.setItem("velora_mira_memory", JSON.stringify(updated));
                            return updated;
                          });
                        }}
                        className="text-white/40 hover:text-rose-400 font-bold cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-neutral-500 italic">Память пуста</div>
              )}
            </div>

            {/* Prompter Hot-Fix Rules */}
            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold flex items-center">
                <span>Быстрые правила поведения</span>
                <InfoTooltip text="Инструкции прямого действия. Напишите здесь правила (например: 'не используй смайлики' или 'отвечай кратко'), и Мира будет строго им следовать при следующем ответе." />
              </div>
              <textarea
                value={customRules}
                onChange={(e) => {
                  setCustomRules(e.target.value);
                  localStorage.setItem("velora_custom_rules", e.target.value);
                }}
                placeholder="Например: Не пиши смайлики. Отвечай жестче. Используй сленг 'треш'."
                className="w-full bg-[#1c2a38] border border-white/10 rounded-xl p-3 text-white text-[16px] focus:outline-none focus:border-blue-500/50 resize-none font-normal leading-normal"
                rows={5}
              />
              <div className="text-[10px] text-neutral-500 leading-normal">
                Эти правила внедряются в её системный промпт при следующем ответе.
              </div>
            </div>

             {/* Training Logs */}
            <div className="space-y-3 bg-[#24303f]/30 border border-white/5 p-3.5 rounded-xl">
              <div className="flex justify-between items-center">
                <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold flex items-center">
                  <span>Собрано правок: {trainingLogs.length}</span>
                  <InfoTooltip text="Количество исправлений, которые вы внесли в ответы ИИ. Скачайте этот файл по окончании 10 дней тестов и передайте разработчику для переобучения ИИ." />
                </span>
                {trainingLogs.length > 0 && (
                  <button 
                    onClick={() => {
                      if (confirm("Очистить все правки в журнале?")) {
                        setTrainingLogs([]);
                        localStorage.removeItem("velora_training_logs");
                      }
                    }}
                    className="text-[10px] text-rose-400 hover:underline animate-in fade-in cursor-pointer"
                  >
                    Очистить
                  </button>
                )}
              </div>
              
              <button
                onClick={handleExportLogs}
                disabled={trainingLogs.length === 0}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded-lg text-xs font-semibold tracking-wide transition-all shadow-md active:scale-95 cursor-pointer disabled:cursor-not-allowed"
              >
                Скачать журнал правок (.JSON)
              </button>
            </div>

            {/* Full Chat History Log */}
            <div className="space-y-3 bg-[#24303f]/30 border border-white/5 p-3.5 rounded-xl">
              <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold flex items-center">
                <span>Журнал чата ({messages.length})</span>
                <InfoTooltip text="Полная история переписки со всеми деталями, эмоциями и фактами. Сохраняется на сервере в реальном времени." />
              </div>
              
              <button
                onClick={handleExportChatHistory}
                disabled={messages.length === 0}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded-lg text-xs font-semibold tracking-wide transition-all shadow-md active:scale-95 cursor-pointer disabled:cursor-not-allowed"
              >
                Скачать историю чата (.JSON)
              </button>
            </div>

            {/* Project Feedbacks */}
            <div className="space-y-3 bg-[#24303f]/30 border border-white/5 p-3.5 rounded-xl">
              <div className="flex justify-between items-center">
                <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold flex items-center">
                  <span>Отзывы по проекту: {feedbacks.length}</span>
                </span>
                {feedbacks.length > 0 && (
                  <button 
                    onClick={loadFeedbacks}
                    className="text-[10px] text-blue-400 hover:underline animate-in fade-in cursor-pointer"
                  >
                    Обновить
                  </button>
                )}
              </div>
              
              {feedbacks.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {feedbacks.slice().reverse().map((f: any) => (
                    <div key={f.id} className="text-xs bg-black/25 border border-white/5 p-2 rounded-lg space-y-1">
                      <div className="flex justify-between text-[10px] text-neutral-500">
                        <span className="font-semibold text-neutral-400 truncate max-w-[120px]">{f.user}</span>
                        <span>{new Date(f.timestamp).toLocaleDateString("ru-RU", {hour:"2-digit", minute:"2-digit"})}</span>
                      </div>
                      <p className="text-white/80 font-normal leading-normal whitespace-pre-wrap">{f.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-neutral-500 italic">Отзывов пока нет</div>
              )}

              <button
                onClick={handleExportFeedback}
                disabled={feedbacks.length === 0}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded-lg text-xs font-semibold tracking-wide transition-all shadow-md active:scale-95 cursor-pointer disabled:cursor-not-allowed"
              >
                Скачать отзывы (.JSON)
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Telegram-style Delete message modal */}
      {deleteModalOpen && messageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => {
              setDeleteModalOpen(false);
              setMessageToDelete(null);
            }}
          />
          <div className="bg-[#1c242f] border border-white/10 w-full max-w-sm rounded-2xl shadow-2xl z-10 p-5 overflow-hidden text-left animate-in scale-in duration-150">
            <h3 className="text-white text-[16px] font-semibold mb-2">Удалить сообщение?</h3>
            <p className="text-white/60 text-xs leading-relaxed mb-4">
              Вы действительно хотите удалить это сообщение?
            </p>
            
            <label className="flex items-center gap-3 cursor-pointer text-xs text-white/80 mb-5 select-none hover:text-white">
              <input 
                type="checkbox"
                checked={deleteForEveryone}
                onChange={(e) => setDeleteForEveryone(e.target.checked)}
                className="w-4 h-4 rounded bg-[#0f161e] border-white/15 text-[#5288c1] focus:ring-blue-500 cursor-pointer accent-[#5288c1]"
              />
              <span>Удалить также для Миры (у всех)</span>
            </label>
            
            <div className="flex justify-end gap-2.5 text-xs font-semibold">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setMessageToDelete(null);
                }}
                className="px-4 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  if (messageToDelete) {
                    confirmDeleteMessage(messageToDelete.id, deleteForEveryone);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating feedback button */}
      <button
        onClick={() => setFeedbackOpen(true)}
        className={`fixed z-40 transition-all duration-300 bg-[#17212b]/90 backdrop-blur-md border border-white/10 hover:border-white/20 text-white rounded-full px-3.5 py-2 shadow-2xl flex items-center justify-center gap-2 hover:scale-105 active:scale-95 cursor-pointer select-none text-xs font-semibold ${
          sidebarOpen ? "right-4 lg:right-[336px]" : "right-4"
        } ${
          replyToMessage ? "bottom-[136px]" : "bottom-[84px]"
        } ${
          isInputFocused ? "max-sm:opacity-0 max-sm:pointer-events-none" : "opacity-100"
        }`}
        title="Обратная связь по проекту"
      >
        <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
        <span>Обратная связь</span>
      </button>

      {/* Project Feedback Modal */}
      {feedbackOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => {
              if (!isSendingFeedback) setFeedbackOpen(false);
            }}
          />
          <div className="bg-[#1c242f] border border-white/10 w-full max-w-md rounded-2xl shadow-2xl z-10 p-6 overflow-hidden text-left animate-in scale-in duration-150">
            <h3 className="text-white text-[16px] font-semibold mb-2">Обратная связь по проекту</h3>
            <p className="text-white/60 text-xs leading-relaxed mb-4">
              Напишите, что бы вы хотели добавить, убрать или улучшить. Ваше мнение очень важно!
            </p>
            
            <textarea
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              placeholder="Например: Добавить стикеры, изменить шрифт или поправить поведение Миры..."
              className="w-full bg-[#0e1621] border border-white/10 rounded-xl p-3 text-white text-[16px] focus:outline-none focus:border-blue-500/50 resize-none font-normal leading-normal placeholder:text-neutral-600 mb-4"
              rows={5}
              disabled={isSendingFeedback || feedbackSuccess}
              autoFocus
            />

            {feedbackError && (
              <p className="text-xs text-rose-400 mb-3 animate-pulse">
                {feedbackError}
              </p>
            )}

            {feedbackSuccess && (
              <p className="text-xs text-emerald-400 mb-3 font-medium flex items-center gap-1.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Отзыв успешно сохранен!
              </p>
            )}
            
            <div className="flex justify-end gap-2.5 text-xs font-semibold">
              <button
                onClick={() => setFeedbackOpen(false)}
                disabled={isSendingFeedback}
                className="px-4 py-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
              >
                Закрыть
              </button>
              <button
                onClick={handleSendFeedback}
                disabled={isSendingFeedback || !feedbackMessage.trim() || feedbackSuccess}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white transition-colors cursor-pointer flex items-center gap-2"
              >
                {isSendingFeedback ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Отправка...
                  </>
                ) : (
                  "Отправить"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
