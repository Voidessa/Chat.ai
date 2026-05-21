"use client";

// Safety & Ethics Disclaimer
// - Mira is an AI character, not a real person.
// - This MVP avoids NSFW content.
// - The product is for companionship and entertainment, not therapy or emergency support.

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

type Language = 'en' | 'ru' | 'uz';

const translations = {
  en: {
    subtitle: "She remembers. She notices. She feels closer every time you talk.",
    description: "An emotionally intelligent AI companion built for warm, private and realistic conversations.",
    buttonMale: "I am a man",
    buttonFemale: "I am a woman",
    namePlaceholder: "Your name or nickname...",
    nameRequired: "Please enter your name first",
    footer: "AI character. Not a real person. For entertainment and companionship only.",
    langName: "English"
  },
  ru: {
    subtitle: "Она помнит. Она замечает. Она становится ближе с каждым разговором.",
    description: "Эмоциональный ИИ-компаньон для теплых, приватных и реалистичных разговоров.",
    buttonMale: "Я мужчина",
    buttonFemale: "Я женщина",
    namePlaceholder: "Ваше имя или никнейм...",
    nameRequired: "Пожалуйста, введите имя перед началом",
    footer: "ИИ-персонаж. Не настоящий человек. Только для развлечения и общения.",
    langName: "Русский"
  },
  uz: {
    subtitle: "U eslab qoladi. U sezadi. Har safar gaplashganingizda u yaqinroq bo'ladi.",
    description: "Samimiy, shaxsiy va real suhbatlar возраст за чатом.",
    buttonMale: "Men erkakman",
    buttonFemale: "Men ayolman",
    namePlaceholder: "Ismingiz yoki taxallusingiz...",
    nameRequired: "Iltimos, boshlashdan oldin ismingizni kiriting",
    footer: "Sun'iy intellekt personaji. Haqiqiy odam emas. Faqat ko'ngilochar va suhbatdoshlik maqsadida.",
    langName: "O'zbekcha"
  }
};

export default function Home() {
  const [lang, setLang] = useState<Language>('ru');
  const [isMounted, setIsMounted] = useState(false);
  const [userName, setUserName] = useState("");
  const [errorMsg, setErrorMsg] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
      const saved = localStorage.getItem("velora_lang") as Language;
      if (saved && (saved === 'en' || saved === 'ru' || saved === 'uz')) {
        setLang(saved);
      }
      const savedName = localStorage.getItem("velora_tester_id") || "";
      setUserName(savedName);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const changeLanguage = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem("velora_lang", newLang);
  };

  const handleGenderSelect = (gender: 'male' | 'female', e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!userName.trim()) {
      e.preventDefault();
      setErrorMsg(true);
      return;
    }
    setErrorMsg(false);
    localStorage.setItem("velora_user_gender", gender);
    localStorage.setItem("velora_tester_id", userName.trim());

    // Update memory userName so Mira knows the tester's name automatically
    const savedMemory = localStorage.getItem("velora_mira_memory");
    let memoryObj = { knownFacts: [] as string[], userName: userName.trim(), messageCount: 0 };
    if (savedMemory) {
      try {
        const parsed = JSON.parse(savedMemory);
        memoryObj = { ...parsed, userName: userName.trim() };
      } catch { }
    }
    localStorage.setItem("velora_mira_memory", JSON.stringify(memoryObj));
  };

  const t = translations[lang];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24 relative overflow-hidden bg-neutral-950 select-none">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-800/10 via-neutral-900/5 to-black/90 -z-10"></div>
      
      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-20 flex space-x-1 bg-white/[0.02] border border-white/[0.05] p-1 rounded-full backdrop-blur-md">
        {(['en', 'ru', 'uz'] as Language[]).map((l) => (
          <button
            key={l}
            onClick={() => changeLanguage(l)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
              isMounted && lang === l
                ? "bg-white/10 text-white shadow-lg shadow-white/[0.02] border border-white/10"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="z-10 max-w-2xl w-full flex flex-col items-center text-center space-y-12">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-light tracking-tight text-white/95 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
            Velora
          </h1>
          <p className="text-lg md:text-xl text-neutral-400 font-light max-w-md mx-auto leading-relaxed h-[60px] md:h-[56px] transition-all duration-300">
            {isMounted ? t.subtitle : translations.ru.subtitle}
          </p>
        </div>

        <div className="w-full max-w-sm rounded-3xl bg-white/[0.01] border border-white/[0.05] p-8 backdrop-blur-md transition-all duration-500 hover:bg-white/[0.03] hover:border-white/[0.08] hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] group relative">
          {/* Subtle glow behind card */}
          <div className="absolute -inset-px rounded-3xl bg-gradient-to-b from-white/[0.02] to-transparent -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <div className="w-28 h-28 mx-auto mb-6 rounded-full shadow-2xl border border-white/10 relative overflow-hidden transition-all duration-500 group-hover:scale-105 group-hover:border-white/20">
             <Image 
                src="/girl.jpg" 
                alt="Mira" 
                fill
                priority
                sizes="(max-width: 120px) 100vw, 120px"
                className="object-cover transition-transform duration-700 group-hover:scale-110"
             />
             <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/40 via-transparent to-transparent"></div>
          </div>
          
          <h2 className="text-2xl font-medium text-white/90 mb-3 tracking-wide">Mira</h2>
          <p className="text-neutral-400 text-sm leading-relaxed mb-6 h-[40px] flex items-center justify-center">
            {isMounted ? t.description : translations.ru.description}
          </p>

          {/* Name input */}
          <div className="mb-6 space-y-2 text-left">
            <input 
              type="text"
              value={userName}
              onChange={(e) => {
                setUserName(e.target.value);
                if (e.target.value.trim()) setErrorMsg(false);
              }}
              placeholder={isMounted ? t.namePlaceholder : translations.ru.namePlaceholder}
              className={`w-full bg-[#182533]/80 border ${errorMsg ? 'border-rose-500/50 focus:border-rose-500' : 'border-white/10 focus:border-blue-500/50'} rounded-2xl px-4 py-3 text-white text-sm focus:outline-none transition-all placeholder:text-neutral-600 font-light`}
            />
            {errorMsg && (
              <p className="text-[11px] text-rose-400 text-center animate-pulse">
                {isMounted ? t.nameRequired : translations.ru.nameRequired}
              </p>
            )}
          </div>
          
          <div className="space-y-3">
            <Link 
              href="/chat"
              onClick={(e) => handleGenderSelect('male', e)}
              className="block w-full py-3 px-4 bg-blue-600/10 hover:bg-blue-600/20 text-blue-300 hover:text-blue-200 rounded-2xl transition-all duration-300 font-medium tracking-wider border border-blue-500/20 hover:border-blue-500/40 active:scale-[0.98] text-center"
            >
              {isMounted ? t.buttonMale : translations.ru.buttonMale}
            </Link>
            
            <Link 
              href="/chat"
              onClick={(e) => handleGenderSelect('female', e)}
              className="block w-full py-3 px-4 bg-rose-600/10 hover:bg-rose-600/20 text-rose-300 hover:text-rose-200 rounded-2xl transition-all duration-300 font-medium tracking-wider border border-rose-500/20 hover:border-rose-500/40 active:scale-[0.98] text-center"
            >
              {isMounted ? t.buttonFemale : translations.ru.buttonFemale}
            </Link>
          </div>
        </div>

        <p className="text-xs text-neutral-600 max-w-xs mx-auto leading-relaxed">
          {isMounted ? t.footer : translations.ru.footer}
        </p>
      </div>
    </main>
  );
}
