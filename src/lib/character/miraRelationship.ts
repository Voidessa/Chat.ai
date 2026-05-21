import { Message } from "@/lib/types";

export type MiraRelationship = {
  stage: "stranger" | "guarded" | "curious" | "warming" | "comfortable" | "close";
  trust: number;      // 0-100
  respect: number;    // 0-100
  curiosity: number;  // 0-100
  warmth: number;     // 0-100
  irritation: number; // 0-100
  distance: number;   // 0-100
  lastBoundaryAt?: string;
  userAskedToStop?: boolean;
  isBlocked?: boolean;
};

export const defaultRelationship: MiraRelationship = {
  stage: "guarded",
  trust: 5,
  respect: 20,
  curiosity: 10,
  warmth: 0,
  irritation: 0,
  distance: 85,
  userAskedToStop: false
};

export function calculateStage(rel: MiraRelationship): MiraRelationship["stage"] {
  if (rel.irritation > 60) return "guarded";
  if (rel.trust < 20 || rel.distance > 70) return "guarded";
  if (rel.trust > 80 && rel.warmth > 75 && rel.respect > 70) return "close";
  if (rel.trust > 60 && rel.warmth > 55 && rel.respect > 60) return "comfortable";
  if (rel.trust > 40 && rel.warmth > 35 && rel.respect > 55) return "warming";
  if (rel.curiosity > 45 && rel.respect > 50) return "curious";
  return "stranger";
}

export function updateRelationshipState(
  current: MiraRelationship,
  userMessage: string,
  userIgnored: boolean = false,
  messageCount: number = 0
): MiraRelationship {
  const next = { ...current };
  const msg = userMessage.toLowerCase().trim();

  // Reset userAskedToStop if they write a normal message after asking to stop
  if (next.userAskedToStop && msg.length > 0) {
    next.userAskedToStop = false;
  }

  // Silence/Ignore penalty
  if (userIgnored) {
    next.warmth = Math.max(0, next.warmth - 8);
    next.respect = Math.max(0, next.respect - 5);
    next.distance = Math.min(100, next.distance + 10);
  }

  const rudeWords = ["отстань", "заткнись", "пошла", "мне пох", "нет отстань", "хер", "бесишь"];
  const extremeInsults = ["мразь", "шлюха", "дура", "конченая", "тварь", "уебище", "блядина", "ебанутая", "шмара", "нахуй", "пиздец", "хуй", "блять", "сука", "еба", "ебать", "пидор", "гандон", "чмо"];
  const dryWords = ["ок", "ясно", "норм", "че", "привет", "как дела", "да", "нет", "понятно", "пон", "ладно", "ладн"];
  const personalWords = ["устал", "работал", "мне тяжело", "переживаю", "не знаю что делать", "у меня проект", "бизнес", "проблемы", "сложно"];
  const complimentWords = ["красивая", "милая", "нравишься", "супер", "умная", "прекрасна", "хорошая", "классная"];
  const apologyWords = ["прости", "извини", "сорян", "виноват", "прощения", "я не прав", "больше не буду"];

  if (extremeInsults.some(w => msg.includes(w))) {
    next.warmth = 0;
    next.trust = 0;
    next.respect = 0;
    next.irritation = Math.min(100, next.irritation + 60);
    next.distance = 100;
  } else if (rudeWords.some(w => msg.includes(w))) {
    next.warmth = Math.max(0, next.warmth - 15);
    next.trust = Math.max(0, next.trust - 10);
    next.respect = Math.max(0, next.respect - 15);
    next.irritation = Math.min(100, next.irritation + 35);
    next.distance = Math.min(100, next.distance + 25);
    
    if (msg.includes("отстань") || msg.includes("не пиши")) {
      next.userAskedToStop = true;
    }
  } else if (apologyWords.some(w => msg.includes(w))) {
    if (next.irritation > 70) {
      next.irritation = Math.max(0, next.irritation - 10);
    } else if (next.irritation > 40) {
      next.irritation = Math.max(0, next.irritation - 20);
    } else {
      next.irritation = 0;
      next.warmth = Math.min(100, next.warmth + 8);
    }
  } else if (dryWords.includes(msg) || (msg.length > 0 && msg.length < 5)) {
    // Dry response: drop warmth and curiosity, increase distance
    next.warmth = Math.max(0, next.warmth - 10);
    next.curiosity = Math.max(0, next.curiosity - 8);
    next.distance = Math.min(100, next.distance + 15);
  } else if (personalWords.some(w => msg.includes(w))) {
    next.trust = Math.min(100, next.trust + 8);
    next.warmth = Math.min(100, next.warmth + 8);
    next.distance = Math.max(0, next.distance - 10);
  } else if (complimentWords.some(w => msg.includes(w))) {
    next.curiosity = Math.min(100, next.curiosity + 5);
    next.warmth = Math.min(100, next.warmth + 5);
    next.respect = Math.min(100, next.respect + 2);
  } else if (msg.length > 5) {
    next.trust = Math.min(100, next.trust + 4);
    next.respect = Math.min(100, next.respect + 4);
    next.curiosity = Math.min(100, next.curiosity + 4);
    next.warmth = Math.min(100, next.warmth + 2);
  }

  if (next.irritation >= 100) {
    next.isBlocked = true;
    next.userAskedToStop = true;
  }

  // Ограничитель теплоты для начала общения (эффект "холодного старта")
  if (messageCount < 25) {
    next.warmth = Math.min(next.warmth, 20); // Не выше 2/10
    next.trust = Math.min(next.trust, 30);
    next.respect = Math.min(next.respect, 30);
    next.curiosity = Math.min(next.curiosity, 15);
  }

  next.stage = calculateStage(next);
  return next;
}
