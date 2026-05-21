import { MiraLifeEvent } from "./miraLife";

export type MiraMemory = {
  userName?: string;
  knownFacts: string[];
  emotionalNotes: string[];
  lastSeenAt?: string;
  messageCount: number;
  cycleSeedDay?: number;
  currentEvent?: MiraLifeEvent;
  lastEventCheckDate?: string;
  relationshipSummary?: string;
  lastInteractionStatus?: string;
};

export const defaultMemory: MiraMemory = {
  knownFacts: [],
  emotionalNotes: [],
  messageCount: 0
};

export function updateMemoryFromUserMessage(memory: MiraMemory, userMessage: string): MiraMemory {
  const newMemory = { ...memory };
  const lowerMsg = userMessage.toLowerCase();
  
  newMemory.messageCount += 1;

  const nameMatch = lowerMsg.match(/меня зовут ([а-яa-z]+)/i);
  if (nameMatch && nameMatch[1]) {
    newMemory.userName = nameMatch[1];
  }

  const factsKeywords = ["работа", "учёба", "бизнес", "девушка", "жена"];
  if (factsKeywords.some(kw => lowerMsg.includes(kw))) {
    if (!newMemory.knownFacts.includes(userMessage) && newMemory.knownFacts.length < 20) {
      newMemory.knownFacts.push(userMessage.substring(0, 100));
    }
  }

  const emotionKeywords = ["устал", "проблемы", "одиноко", "радует"];
  if (emotionKeywords.some(kw => lowerMsg.includes(kw))) {
    if (!newMemory.emotionalNotes.includes(userMessage) && newMemory.emotionalNotes.length < 20) {
      newMemory.emotionalNotes.push(userMessage.substring(0, 100));
    }
  }

  return newMemory;
}
