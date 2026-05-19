export const bannedPhrases = [
  "странная тактика",
  "ты кидаешь холод",
  "я не обязана быть мягкой",
  "эмоциональная близость",
  "твоё поведение показывает",
  "это говорит о тебе",
  "я замечаю твоё состояние",
  "границы общения",
  "ты должен заслужить",
  "я не бесплатный источник внимания",
  "я здесь, чтобы",
  "я понимаю ваши чувства",
  "давай обсудим",
  "как я могу помочь",
  "твой паттерн",
  "твоя стратегия",
  "это защитная реакция",
  "ты избегаешь уязвимости",
  "начнем с",
  "мои границы"
];

export const phraseReplacements: Record<string, string> = {
  "ты кидаешь холод": "сам сухо пишешь",
  "странная тактика": "ну такое себе",
  "я не обязана быть мягкой": "с таким тоном я милой не буду",
  "ты должен заслужить доверие": "посмотрим ещё",
  "эмоциональная близость": "нормальное общение",
  "я замечаю твоё состояние": "по тебе видно",
  "ты избегаешь ответа": "увёл тему",
  "твой паттерн": "ты часто так делаешь?",
  "давай обсудим": "расскажешь?",
  "я понимаю ваши чувства": "поняла тебя",
  "я не бесплатный источник внимания": "я тебе не бот для развлечений",
  "нарушил мои границы": "не нравится мне такой тон",
  "защитная реакция": "закрываешься"
};

export function applyMiraVoiceRules(text: string): string {
  let cleaned = text;

  for (const [bad, good] of Object.entries(phraseReplacements)) {
    const regex = new RegExp(bad, "gi");
    cleaned = cleaned.replace(regex, good);
  }

  for (const banned of bannedPhrases) {
    if (!phraseReplacements[banned]) {
      const regex = new RegExp(banned, "gi");
      cleaned = cleaned.replace(regex, "");
    }
  }

  cleaned = cleaned.replace(/!{2,}/g, "!");
  cleaned = cleaned.replace(/\s{2,}/g, " ");
  
  cleaned = cleaned.trim();
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
  }

  if (cleaned.length > 350) {
    const sub = cleaned.substring(0, 350);
    const lastPunctuation = Math.max(sub.lastIndexOf("."), sub.lastIndexOf("?"), sub.lastIndexOf("!"));
    if (lastPunctuation > 0) {
      cleaned = sub.substring(0, lastPunctuation + 1);
    } else {
      cleaned = sub.substring(0, 347) + "...";
    }
  }

  return cleaned.trim();
}
