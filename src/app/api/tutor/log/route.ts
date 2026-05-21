import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const LOGS_DIR = path.join(process.cwd(), "training_logs");

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase();
}

export async function POST(req: Request) {
  try {
    const entry = await req.json();
    const testerId = entry.testerId ? sanitizeFileName(entry.testerId) : "default";
    
    // Ensure dir exists
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }

    const filePath = path.join(LOGS_DIR, `logs_${testerId}.json`);
    
    // Read current logs for this tester
    let logs = [];
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, "utf-8");
        logs = JSON.parse(fileContent);
      } catch {
        console.warn(`Could not parse existing logs_${testerId}.json, starting fresh.`);
      }
    }
    
    // Add new entry
    logs.push({
      ...entry,
      serverTimestamp: new Date().toISOString()
    });
    
    // Write back
    fs.writeFileSync(filePath, JSON.stringify(logs, null, 2), "utf-8");
    
    return NextResponse.json({ success: true, count: logs.length, testerId });
  } catch (error) {
    console.error("Tutor Log POST error:", error);
    return NextResponse.json({ error: "Failed to write log to server" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const testerId = url.searchParams.get("testerId");

    if (!fs.existsSync(LOGS_DIR)) {
      return NextResponse.json({});
    }

    if (testerId) {
      const sanitized = sanitizeFileName(testerId);
      const filePath = path.join(LOGS_DIR, `logs_${sanitized}.json`);
      if (!fs.existsSync(filePath)) {
        return NextResponse.json([]);
      }
      const fileContent = fs.readFileSync(filePath, "utf-8");
      return NextResponse.json(JSON.parse(fileContent));
    }

    // Consolidated view of all logs
    const files = fs.readdirSync(LOGS_DIR);
    const allLogs: Record<string, unknown[]> = {};

    for (const file of files) {
      if (file.startsWith("logs_") && file.endsWith(".json")) {
        const key = file.replace("logs_", "").replace(".json", "");
        try {
          const content = fs.readFileSync(path.join(LOGS_DIR, file), "utf-8");
          allLogs[key] = JSON.parse(content);
        } catch {
          console.warn(`Could not parse ${file}`);
        }
      }
    }

    return NextResponse.json(allLogs);
  } catch (error) {
    console.error("Tutor Log GET error:", error);
    return NextResponse.json({ error: "Failed to read logs from server" }, { status: 500 });
  }
}
