import fs from "fs";
import path from "path";

const LOGS_DIR = path.join(process.cwd(), "training_logs");

function ensureLogsDir() {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase();
}

export function logUserAlias(deviceId: string, testerId: string, userName: string) {
  ensureLogsDir();
  const aliasesPath = path.join(LOGS_DIR, "user_aliases.jsonl");
  const entry = {
    timestamp: new Date().toISOString(),
    deviceId,
    testerId,
    userName
  };
  fs.appendFileSync(aliasesPath, JSON.stringify(entry) + "\n", "utf-8");
}

export function appendToTranscript(testerId: string, message: any) {
  ensureLogsDir();
  const safeTesterId = sanitizeFileName(testerId);
  const jsonlPath = path.join(LOGS_DIR, `transcript_${safeTesterId}.jsonl`);
  const txtPath = path.join(LOGS_DIR, `dialogue_${safeTesterId}.txt`);
  
  // JSONL append
  fs.appendFileSync(jsonlPath, JSON.stringify(message) + "\n", "utf-8");

  // TXT append
  // Using generic formatting to avoid timeZone errors in different environments
  let dateStr = "";
  try {
     dateStr = new Date(message.timestamp).toLocaleString("ru-RU");
  } catch(e) {
     dateStr = message.timestamp;
  }
  const sender = message.role === "user" ? (message.metadata?.userName || "Пользователь") : "Велора";
  const content = message.content || (message.imageUrl ? "[Изображение]" : "");
  
  fs.appendFileSync(txtPath, `[${dateStr}] ${sender}: ${content}\n`, "utf-8");
}

export function appendLearnedFeminineTraits(traits: string[]) {
  if (!traits || !Array.isArray(traits) || traits.length === 0) return;
  ensureLogsDir();
  const knowledgePath = path.join(LOGS_DIR, "global_feminine_knowledge.txt");
  
  const timestamp = new Date().toISOString();
  for (const trait of traits) {
    if (trait && typeof trait === 'string' && trait.trim()) {
      fs.appendFileSync(knowledgePath, `[${timestamp}] ${trait.trim()}\n`, "utf-8");
    }
  }
}

export function getLearnedFeminineTraits(limit: number = 20): string[] {
  ensureLogsDir();
  const knowledgePath = path.join(LOGS_DIR, "global_feminine_knowledge.txt");
  if (!fs.existsSync(knowledgePath)) return [];
  
  try {
    const lines = fs.readFileSync(knowledgePath, "utf-8")
      .split("\n")
      .filter(l => l.trim().length > 0);
      
    // Return only the text without the timestamp prefix
    return lines.slice(-limit).map(l => {
      const match = l.match(/^\[.*?\]\s*(.*)$/);
      return match ? match[1] : l;
    });
  } catch (e) {
    return [];
  }
}
