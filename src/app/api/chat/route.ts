import { NextResponse } from "next/server";
import { analyzeMiraState } from "@/lib/character/miraState";
import { buildMiraSystemPrompt } from "@/lib/character/miraPromptBuilder";
import { defaultRelationship } from "@/lib/character/miraRelationship";
import { applyMiraVoiceRules } from "@/lib/character/miraVoice";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages;
    const relationship = body.relationship || defaultRelationship;
    const memory = body.memory || { knownFacts: [], emotionalNotes: [], messageCount: 0 };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.warn("API Key missing, falling back to mock");
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const model = process.env.AI_MODEL || "gpt-4o-mini";

    const state = analyzeMiraState(messages, relationship);
    const systemPrompt = buildMiraSystemPrompt(memory, state);

    // Keep only last 20 messages for context window, skip empty
    const recentMessages = messages
      .filter((msg: any) => msg.content && msg.content.trim() !== "")
      .slice(-20);

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...recentMessages.map((msg: any) => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content
      }))
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model, 
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("AI API error:", errorData.substring(0, 100));
      throw new Error("Failed to fetch from AI provider");
    }

    const data = await response.json();
    let replyContent = data.choices[0].message.content;

    // Apply the Voice Layer cleanup
    replyContent = applyMiraVoiceRules(replyContent);

    const replies = replyContent.split("|").map((r: string) => r.trim()).filter(Boolean);
    if (replies.length === 0) {
      replies.push("окей");
    }

    return NextResponse.json({ replies });

  } catch (error) {
    console.error("Chat API Route Error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
