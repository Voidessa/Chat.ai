export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  feedback?: "like" | "dislike";
  replyTo?: { id: string; content: string };
  status?: "sent" | "read";
  audioUrl?: string;
  aiReaction?: "heart" | "laugh" | "sad" | "angry";
};
