import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const LOGS_DIR = path.join(process.cwd(), "training_logs");

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase();
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const testerId = data.testerId ? sanitizeFileName(data.testerId) : "unknown";
    
    // Ensure logs directory exists
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }

    const filePath = path.join(LOGS_DIR, `chat_history_${testerId}.json`);
    
    // Write full chat history state
    fs.writeFileSync(filePath, JSON.stringify({
      testerId: data.testerId,
      userGender: data.userGender,
      lastUpdated: new Date().toISOString(),
      relationship: data.relationship,
      memory: data.memory,
      messages: data.messages || []
    }, null, 2), "utf-8");

    return NextResponse.json({ success: true, testerId });
  } catch (error) {
    console.error("Chat Log POST error:", error);
    return NextResponse.json({ error: "Failed to write chat history log to server" }, { status: 500 });
  }
}
