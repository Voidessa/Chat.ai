import { Message } from "@/lib/types";
import { MiraRelationship } from "./miraRelationship";

export type MiraState = {
  relationship: MiraRelationship;
  shouldSetBoundary: boolean;
  shouldWithdraw: boolean;
  canBeWarm: boolean;
  canFlirt: boolean;
  canBeVulnerable: boolean;
  responseTimeMinutes: number;
};

export function analyzeMiraState(messages: Message[], relationship: MiraRelationship): MiraState {
  const userMessages = messages.filter(m => m.role === "user");
  const lastUserMessage = userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
  const lastUserText = lastUserMessage ? lastUserMessage.content.toLowerCase() : "";

  let responseTimeMinutes = 0;
  if (lastUserMessage && messages.length >= 2) {
    const lastUserIndex = messages.findIndex(m => m.id === lastUserMessage.id);
    if (lastUserIndex > 0) {
      const prevMsg = messages[lastUserIndex - 1];
      const prevTime = new Date(prevMsg.createdAt).getTime();
      const currTime = new Date(lastUserMessage.createdAt).getTime();
      if (!isNaN(prevTime) && !isNaN(currTime)) {
        responseTimeMinutes = (currTime - prevTime) / 60000;
      }
    }
  }

  const rudeWords = ["отстань", "заткнись", "пошла", "мне пох", "нет отстань"];
  const isRude = rudeWords.some(w => lastUserText.includes(w));

  return {
    relationship,
    canBeWarm: relationship.warmth > 35 && relationship.irritation < 40,
    canFlirt: relationship.curiosity > 45 && relationship.respect > 50 && relationship.irritation < 35,
    canBeVulnerable: relationship.stage === "comfortable" || relationship.stage === "close",
    shouldSetBoundary: isRude || relationship.irritation > 50,
    shouldWithdraw: relationship.userAskedToStop || (isRude && relationship.irritation > 70),
    responseTimeMinutes
  };
}
