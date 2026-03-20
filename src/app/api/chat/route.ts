import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages, model, apiKey, provider, baseUrl: customBaseUrl, systemPrompt: userSystemPrompt, zeroFrictionCount = 3 } = await req.json();

    const isLocalProvider = provider === 'ollama' || provider === 'custom';
    if (!apiKey && !isLocalProvider) {
      return NextResponse.json({ error: 'API Key is required' }, { status: 400 });
    }

    const chartTool = {
      name: "generate_chart",
      description: "Generate a visual chart (bar, line, or pie) based on data trends or comparisons.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["bar", "line", "pie"] },
          xAxisKey: { type: "string" },
          keys: { type: "array", items: { type: "string" } },
          data: { type: "array", items: { type: "object" } }
        },
        required: ["type", "xAxisKey", "keys", "data"]
      }
    };

    const finalSystemPrompt = userSystemPrompt || "You are NexusBoard AI, a high-performance analytical assistant.";

    // 辅助：检测用户是否使用了中文
    const isChinese = (text: string) => /[\u4e00-\u9fa5]/.test(text);
    
    // --- 核心逻辑：从用户消息中提取语言偏好 ---
    const userMessages = messages.filter((m: any) => m.role === 'user');
    const lastUserMsg = userMessages[userMessages.length - 1]?.content || "";
    const firstUserMsg = userMessages[0]?.content || "";
    const isUserChinese = isChinese(firstUserMsg) || isChinese(lastUserMsg);

    const suggestionSchema = {
      type: "object",
      properties: {
        suggestions: {
          type: "array",
          items: { 
            type: "string", 
            description: `A specific follow-up command in ${isUserChinese ? 'Chinese' : 'the same language as the user'}. No generic meta-instructions.` 
          }
        }
      },
      required: ["suggestions"]
    };

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    if (provider === 'gemini') {
      const geminiModel = model || 'gemini-2.0-flash';
      const base = (customBaseUrl || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
      const url = `${base}/models/${geminiModel}:streamGenerateContent?key=${apiKey}`;

      const filteredMessages = messages.filter((m: any) => m.role !== 'system');
      const contents = filteredMessages.map((msg: any) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents,
          systemInstruction: { parts: [{ text: finalSystemPrompt }] },
          tools: [{ function_declarations: [chartTool] }]
        })
      });

      if (!response.ok) return NextResponse.json({ error: 'Gemini Error' }, { status: response.status });

      const reader = response.body?.getReader();
      let fullText = "";

      const stream = new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader!.read();
              if (done) break;
              const chunk = decoder.decode(value);
              controller.enqueue(value);
              try {
                const json = JSON.parse(chunk.replace(/^\[|,|\]$/g, ''));
                const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) fullText += text;
              } catch (e) {}
            }

            // --- Gemini 预测：使用用户语言 ---
            const predictPrompt = isUserChinese 
              ? `基于上下文提供 ${zeroFrictionCount} 个具体深刻的后续指令。必须用中文。严禁“提供信息”等废话。示例：“分析具体瓶颈”、“生成改进模板”。`
              : `Suggest ${zeroFrictionCount} specific follow-up commands. Use the SAME language as the user's input. NO generic meta-talk. Max 4 words each.`;

            const predictUrl = `${base}/models/${geminiModel}:generateContent?key=${apiKey}`;
            const predictRes = await fetch(predictUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: predictPrompt + `\n\nContext to analyze: "${fullText.slice(-800)}"` }] }],
                generationConfig: { responseMimeType: "application/json", responseSchema: suggestionSchema }
              })
            });

            if (predictRes.ok) {
              const json = await predictRes.json();
              const result = JSON.parse(json.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
              if (result.suggestions) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ suggestions: result.suggestions.slice(0, zeroFrictionCount) })}\n\n`));
              }
            }
            controller.close();
          } catch (e) { controller.error(e); }
        }
      });
      return new NextResponse(stream, { headers: { 'Content-Type': 'text/event-stream' } });
    }

    // 2. OpenAI / DeepSeek 预测：使用用户语言
    let openAiUrl = provider === 'deepseek' ? 'https://api.deepseek.com/chat/completions' : 'https://api.openai.com/v1/chat/completions';
    if (customBaseUrl) openAiUrl = customBaseUrl.replace(/\/$/, '') + '/chat/completions';

    const response = await fetch(openAiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: model || 'gpt-4o',
        messages: [{ role: 'system', content: finalSystemPrompt }, ...messages],
        stream: true,
      }),
    });

    const reader = response.body?.getReader();
    let fullText = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader!.read();
            if (done) break;
            controller.enqueue(value);
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                  const content = JSON.parse(line.replace('data: ', '')).choices[0].delta.content;
                  if (content) fullText += content;
                } catch (e) {}
              }
            }
          }

          const sysContent = isUserChinese 
            ? `你是一个深度意图预测助手。必须使用中文返回 JSON 对象 {"suggestions": []}。
               规则：
               1. 提供 ${zeroFrictionCount} 个具体的后续指令。
               2. 绝对禁用元指令（如：输入、提供、告诉我）。
               3. 必须是具体内容，如：“制定 reframing 模板”、“识别核心挑战”。`
            : `Suggest ${zeroFrictionCount} highly specific commands in JSON. Use the SAME language as the user. NO meta-talk. Max 4 words.`;

          const predictRes = await fetch(openAiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
              model: model || 'gpt-4o',
              messages: [
                { role: 'system', content: sysContent },
                { role: 'assistant', content: fullText.slice(-1200) }
              ],
              response_format: { type: "json_object" }
            }),
          });

          if (predictRes.ok) {
            const json = await predictRes.json();
            const suggestions = JSON.parse(json.choices[0].message.content).suggestions;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ suggestions: suggestions.slice(0, zeroFrictionCount) })}\n\n`));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (e) { controller.error(e); }
      }
    });

    return new NextResponse(stream, { headers: { 'Content-Type': 'text/event-stream' } });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
