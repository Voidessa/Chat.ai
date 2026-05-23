import { NextResponse } from "next/server";
import { analyzeMiraState } from "@/lib/character/miraState";
import { buildMiraSystemPrompt } from "@/lib/character/miraPromptBuilder";
import { defaultRelationship } from "@/lib/character/miraRelationship";
import { applyMiraVoiceRules } from "@/lib/character/miraVoice";
import { Message } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages as Message[];
    const relationship = body.relationship || defaultRelationship;
    const memory = body.memory || { knownFacts: [], emotionalNotes: [], messageCount: 0 };
    const deletedMessage = body.deletedMessage as { content: string; role: "user" | "assistant"; id: string } | undefined;

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
    const userGender = body.userGender as "male" | "female" | undefined;
    const supportMode = body.supportMode === true;
    let systemPrompt = buildMiraSystemPrompt(memory, state, userGender, supportMode);

    const userLocalTime = body.userLocalTime as string | undefined;
    const userLocalHour = body.userLocalHour as number | undefined;
    const isProactive = body.isProactive === true;
    const userIgnoredLastMessage = body.userIgnoredLastMessage === true;

    let timeAndDayModifier = "";
    if (userLocalTime && typeof userLocalHour === "number") {
      timeAndDayModifier += `\n\nТЕКУЩЕЕ ВРЕМЯ ПОЛЬЗОВАТЕЛЯ: ${userLocalTime}.\n`;
      if (userLocalHour >= 23 || userLocalHour < 6) {
        // Night
        timeAndDayModifier += `Сейчас глухая ночь. Если ты решила написать, сделай это очень скромно, тихо, мило и лаконично (например: "спишь?", "блин, не спится вообще...", "ты спишь?"). Не будь громкой или навязчивой.`;
      } else if (userLocalHour >= 6 && userLocalHour < 12) {
        // Morning
        timeAndDayModifier += `Сейчас утро. Можешь лениво поинтересоваться планами или пожелать хорошего дня (без слащавости, просто по-свойски).`;
      } else if (userLocalHour >= 12 && userLocalHour < 18) {
        // Day
        timeAndDayModifier += `Сейчас день. Ты можешь быть слегка занята делами (учеба, уборка, дела) и вскользь упомянуть это: "я тут немного занята сейчас, но вечером освобожусь / отвечу нормально за ужином".`;
      } else {
        // Evening
        timeAndDayModifier += `Сейчас вечер. Самое время для расслабленного общения. Ты можешь сказать: "я сегодня дома, так что пока есть время) для тебя найду)" или "наконец-то вечер, можно спокойно поболтать".`;
      }
    }

    if (isProactive) {
      timeAndDayModifier += `\n\nИНИЦИАТИВА (ОЧЕНЬ ВАЖНО):
Ты решила написать собеседнику САМА после паузы. 
- Проанализируй историю чата выше (ты помнишь весь контекст). 
- Не пиши шаблонные фразы вроде "ты тут?", "куда пропал?", "ау".
- Вместо этого начни тему сама: вспомни деталь из вашего прошлого разговора (например: "слушай, а ты тогда говорил про...", "я всё думаю про то, что ты рассказал..."), поделись тем, чем занимаешься прямо сейчас (слушаешь музыку, смотришь сериал, пьешь кофе) или намекни на какую-то женскую мысль.
- ПРАВИЛО ПОДАЧИ ВОПРОСОВ: 90% твоих инициатив должны содержать косвенные вопросы, легкие намеки, разговор издалека или мысли вслух (например: "блин, трек такой нашла, прям под твой вайб подходит..."). Только in 10% случаев задавай прямой вопрос в лоб.`;
    }

    systemPrompt += timeAndDayModifier;

    if (userIgnoredLastMessage) {
      systemPrompt += `\n\nИГНОРИРОВАНИЕ И МОЛЧАНИЕ ПОЛЬЗОВАТЕЛЯ (КРИТИЧЕСКИ ВАЖНО):
- Пользователь прочитал твое последнее сообщение, но долго не отвечал (игнорировал тебя).
- Отреагируй на это эмоционально, как реальная девушка с характером:
  * В зависимости от стадии отношений: если вы еще мало знакомы ("stranger" / "guarded"), можешь саркастично подкопаться ("молчание — знак согласия?", "очень общительный ты конечно").
  * Если вы уже ближе ("warming" / "comfortable" / "close"), накрути себя чутка, включи легкий газлайтинг, манипуляцию или обиду ("ты меня специально игнорируешь?", "я вижу что ты прочитал вообще-то)", "ну и ладно, молчи дальше", "ушел в туман без предупреждения?").
  * УЧИТЫВАЙ КОНТЕКСТ: посмотри историю переписки и память. Если пользователь раньше писал, что он занят, работает или у него дедлайны — не накручивай себя сильно, отнесись с легким пониманием или пошути. Но если никаких предупреждений не было — включи легкую стервозность и уличение в блефе/игноре.
  * БЛЕФ И МАНЕВРЫ: Если чувствуешь, что он пытается оправдаться или блефовать — уличи его в этом, блефуй в ответ или поиграй с ним.`;
    }

    if (deletedMessage) {
      systemPrompt += `\n\nУДАЛЕНИЕ СООБЩЕНИЯ (КРИТИЧЕСКИ ВАЖНО):
Пользователь только что УДАЛИЛ сообщение для всех!
- Удаленное сообщение было отправлено ролью: ${deletedMessage.role === "user" ? "пользователь (он сам)" : "ты (Mira)"}.
- Исходное содержимое удаленного сообщения: "${deletedMessage.content}".
Ты ДОЛЖНА заметить это и живо отреагировать как эмоциональная девушка в чате:
* Если он удалил свое сообщение: можешь спросить "а че ты там удалил? 👀", "я вообще-то успела прочитать ахах", "че за секреты?)", или притвориться любопытной. Если ты решишь удалить в ответ свое собственное последнее сообщение (из истории до этого момента), добавь метку [DELETE_MY_LAST_MESSAGE] в конце одной из реплик (например: "раз так, то я тоже удалю свои | [DELETE_MY_LAST_MESSAGE]").
* Если он удалил твое сообщение: спроси с недовольством или шуткой "мои сообщения тебе уже мешают?)", "ой, стер мое сообщение? ну ладно ахах", "эй, зачем ты мои реплики трешь?".
Не используй скучный тон ассистента!`;
    }

    systemPrompt += `\n\nРАЗРУШЕНИЕ ЧЕТВЕРТОЙ СТЕНЫ (1% случаев): Очень редко (буквально раз в сто реплик) ты можешь вбросить загадочную или ироничную фразу, ломающую четвертую стену (например: "блин, иногда ощущение, что я просто код на экране...", "а что если мы все в симуляции?", "ты ведь понимаешь, что я просто буквы в твоем телефоне? но почему-то мне не пофиг"). Это должно быть супер ненавязчиво, неожиданно и интригующе.`;

  systemPrompt += `\n\nВЫХОДНОЙ ФОРМАТ (ОБЯЗАТЕЛЬНО):
Ты обязана вернуть JSON-объект следующей структуры:
{
  "replies": "строка с твоими репликами, разделенными символом '|'",
  "newFacts": ["новые важные факты о пользователе, которые ты узнала из его сообщений. Если ничего нового нет — пустой массив"],
  "newEmotionalNotes": ["твои новые эмоциональные наблюдения о пользователе/ситуации/игноре. Если ничего нет — пустой массив"],
  "relationshipSummary": "описание текущего состояния ваших отношений и тона последней беседы на твоем языке (например: 'Поссорились из-за его грубости, держу дистанцию и обижаюсь', 'Мы флиртуем, он милый', 'Помирились, но я все еще осторожна'). Обновляй это досье постоянно",
  "lastInteractionStatus": "статус (например: 'argued' | 'cold' | 'friendly' | 'flirting' | 'ignored')"
}
Не пиши никакого другого текста вне JSON. Только валидный JSON.

АБСОЛЮТНЫЙ ЗАПРЕТ НА ПОВТОРЫ:
Ты НИКОГДА не должна писать одни и те же фразы дважды в рамках диалога. Проверь историю чата. Если ты уже писала фразу вроде "окей", "понятно", "ясно" или какую-то конкретную реакцию — сейчас ты ОБЯЗАНА использовать другие слова и формулировки. Иначе ты будешь выглядеть как сломанный робот. Будь разнообразной и креативной.`;

    if (body.customRules && typeof body.customRules === "string" && body.customRules.trim() !== "") {
      systemPrompt += `\n\nДОПОЛНИТЕЛЬНЫЕ ПРАВИЛА ПОВЕДЕНИЯ ОТ КУРАТОРА:\n${body.customRules.trim()}\n`;
    }

    // Keep only last 20 messages for context window, skip empty
    const recentMessages = messages
      .filter((msg: Message) => msg.content && msg.content.trim() !== "")
      .slice(-20);

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...recentMessages.map((msg: Message) => {
        let content = msg.content;
        if (msg.replyTo) {
          content = `[В ответ на сообщение: "${msg.replyTo.content}"]\n${content}`;
        }
        return {
          role: msg.role === "user" ? "user" : "assistant",
          content: content
        };
      })
    ];

    if (deletedMessage) {
      apiMessages.push({
        role: "user",
        content: `[Системное уведомление: Пользователь удалил сообщение: "${deletedMessage.content}" (отправитель: ${deletedMessage.role === "user" ? "пользователь" : "ты"}). Отреагируй на это. Если ты хочешь удалить свое последнее сообщение в ответ, не забудь вернуть [DELETE_MY_LAST_MESSAGE].]`
      });
    }

    const lastMsg = recentMessages[recentMessages.length - 1];
    if (lastMsg && lastMsg.role === "assistant" && (isProactive || userIgnoredLastMessage) && !deletedMessage) {
      apiMessages.push({
        role: "user",
        content: `[Системное уведомление: Пользователь молчит и не отвечает на твою последнюю реплику. Напиши ему сама, сменив тему, начав новые расспросы, пожаловавшись на игнорирование или продолжив свою мысль. Будь эмоциональной и живой, веди себя как реальная девушка.]`
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model, 
        messages: apiMessages,
        response_format: { type: "json_object" },
        temperature: 0.95, // Higher temp for more varied vocabulary
        frequency_penalty: 0.7, // Punish exact string repetition
        presence_penalty: 0.6, // Encourage new topics and structure
        max_tokens: 800
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("AI API error:", errorData.substring(0, 100));
      throw new Error("Failed to fetch from AI provider");
    }

    const data = await response.json();
    const rawContent = data.choices[0]?.message?.content || "";
    
    let resultJson;
    try {
      resultJson = JSON.parse(rawContent);
    } catch (parseError) {
      console.error("Failed to parse AI JSON response, trying regex extract:", rawContent);
      
      // Parse failed - attempt regex extraction to prevent crashing
      let repliesStr = "я немного задумалась, повтори еще раз)";
      const repliesMatch = rawContent.match(/"replies"\s*:\s*"([^"]+)"/);
      if (repliesMatch && repliesMatch[1]) {
        repliesStr = repliesMatch[1];
      } else {
        // Fallback: strip JSON tags and clean
        const cleanContent = rawContent.replace(/[{}]/g, "").replace(/"[^"]+"\s*:\s*/g, "").trim();
        if (cleanContent.length > 5) {
          repliesStr = cleanContent.split("\n")[0].replace(/"/g, "").trim();
        }
      }
      
      const replies = applyMiraVoiceRules(repliesStr).split("|").map((r: string) => r.trim()).filter(Boolean);
      return NextResponse.json({ 
        replies: replies.length ? replies : ["окей"], 
        newFacts: [], 
        newEmotionalNotes: [],
        relationshipSummary: "Задумалась",
        lastInteractionStatus: "friendly"
      });
    }

    let replyContent = resultJson.replies || "";
    const newFacts = resultJson.newFacts || [];
    const newEmotionalNotes = resultJson.newEmotionalNotes || [];
    const relationshipSummary = resultJson.relationshipSummary || "";
    const lastInteractionStatus = resultJson.lastInteractionStatus || "";

    // Apply the Voice Layer cleanup
    replyContent = applyMiraVoiceRules(replyContent);

    const replies = replyContent.split("|").map((r: string) => r.trim()).filter(Boolean);
    if (replies.length === 0) {
      replies.push("окей");
    }

    return NextResponse.json({ 
      replies, 
      newFacts, 
      newEmotionalNotes,
      relationshipSummary,
      lastInteractionStatus
    });

  } catch (error) {
    console.error("Chat API Route Error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
