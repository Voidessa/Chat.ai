import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: "Missing ELEVENLABS_API_KEY" }, { status: 500 });
    }

    // Подготовка текста для лучшего произношения в ElevenLabs (для русского языка)
    let processedText = text
      .replace(/\|/g, ",") // Заменяем разделители на запятые для естественных пауз
      .replace(/\*/g, "")  // Убираем звездочки
      .replace(/~/g, "")   // Убираем тильды
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ""); // Удаляем эмодзи
    
    // Фонетические корректировки популярных сленговых слов
    processedText = processedText
      .replace(/\bхз\b/gi, "хээ зээ")
      .replace(/\bче\b/gi, "чё")
      .replace(/\bщас\b/gi, "щаас")
      .replace(/\bоч\b/gi, "очень")
      .replace(/\bахах\b/gi, "ха-ха")
      .replace(/\bахаха\b/gi, "ха-ха-ха")
      .trim();

    const voiceId = process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL"; // default to Bella or any known female voice
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey
      },
      body: JSON.stringify({
        text: processedText,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.32,          // Низкая стабильность = больше эмоций
          similarity_boost: 0.85,   // Высокая схожесть = чистый голос
          style: 0.35,              // Преувеличение стиля/интонации
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", errorText);
      return NextResponse.json({ error: "Failed to fetch TTS" }, { status: 500 });
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "audio/mpeg"
      }
    });

  } catch (error) {
    console.error("TTS API Route Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
