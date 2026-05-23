import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const FEEDBACK_FILE = path.join(process.cwd(), "training_logs", "feedback.json");

export async function POST(req: Request) {
  try {
    const { message, user, gender, userAgent } = await req.json();

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const dir = path.dirname(FEEDBACK_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let feedbackList = [];
    if (fs.existsSync(FEEDBACK_FILE)) {
      try {
        const fileContent = fs.readFileSync(FEEDBACK_FILE, "utf-8");
        feedbackList = JSON.parse(fileContent);
      } catch {
        console.warn("Could not parse existing feedback file, starting fresh.");
      }
    }

    const newFeedback = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      user: user || "anonymous",
      gender: gender || "not specified",
      message: message.trim(),
      userAgent: userAgent || "unknown",
    };

    feedbackList.push(newFeedback);

    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(feedbackList, null, 2), "utf-8");

    return NextResponse.json({ success: true, count: feedbackList.length });
  } catch (error) {
    console.error("Feedback POST error:", error);
    return NextResponse.json({ error: "Failed to write feedback to server" }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (!fs.existsSync(FEEDBACK_FILE)) {
      return NextResponse.json([]);
    }
    const fileContent = fs.readFileSync(FEEDBACK_FILE, "utf-8");
    return NextResponse.json(JSON.parse(fileContent));
  } catch (error) {
    console.error("Feedback GET error:", error);
    return NextResponse.json({ error: "Failed to read feedback from server" }, { status: 500 });
  }
}
