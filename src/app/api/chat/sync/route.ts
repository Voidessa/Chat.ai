import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SYNC_DIR = path.join(process.cwd(), "training_logs", "sync");

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get("deviceId");
    
    if (!deviceId) return NextResponse.json({ error: "No deviceId provided" }, { status: 400 });

    const safeId = sanitizeFileName(deviceId);
    const filePath = path.join(SYNC_DIR, `sync_${safeId}.json`);
    
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return new NextResponse(data, { headers: { "Content-Type": "application/json" } });
    }
    
    return NextResponse.json({ notFound: true });
  } catch (error) {
    console.error("Chat Sync GET error:", error);
    return NextResponse.json({ error: "Failed to read sync log" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const deviceId = data.deviceId ? sanitizeFileName(data.deviceId) : null;
    
    if (!deviceId) return NextResponse.json({ error: "No deviceId provided" }, { status: 400 });

    if (!fs.existsSync(SYNC_DIR)) {
      fs.mkdirSync(SYNC_DIR, { recursive: true });
    }

    const filePath = path.join(SYNC_DIR, `sync_${deviceId}.json`);
    
    fs.writeFileSync(filePath, JSON.stringify({
      deviceId: data.deviceId,
      testerId: data.testerId,
      lastUpdated: new Date().toISOString(),
      relationship: data.relationship,
      memory: data.memory,
      messages: data.messages || []
    }), "utf-8");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Chat Sync POST error:", error);
    return NextResponse.json({ error: "Failed to write sync log" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get("deviceId");
    
    if (!deviceId) return NextResponse.json({ error: "No deviceId provided" }, { status: 400 });

    const safeId = sanitizeFileName(deviceId);
    const filePath = path.join(SYNC_DIR, `sync_${safeId}.json`);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Chat Sync DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete sync log" }, { status: 500 });
  }
}
