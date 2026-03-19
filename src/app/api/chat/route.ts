import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages, model, apiKey, provider, baseUrl: customBaseUrl, systemPrompt: userSystemPrompt, zeroFrictionCount = 3 } = await req.json();

    const isLocalProvider = provider === 'ollama' || provider === 'custom';
    if (!apiKey && !isLocalProvider) {
      return NextResponse.json({ error: 'API Key is required' }, { status: 400 });
    }

    const defaultSystemPrompt = `You are NexusBoard AI. 
Every response MUST conclude with exactly ${zeroFrictionCount} follow-up suggestions in the format: [NEXT: Label].
The labels should be short, actionable, and progress the current concept.`;

    const finalSystemPrompt = userSystemPrompt 
      ? `${userSystemPrompt}\n\nIMPORTANT: Every response MUST conclude with exactly ${zeroFrictionCount} follow-up suggestions in the format: [NEXT: Label].`
      : defaultSystemPrompt;

    // 1. 处理 Google Gemini 逻辑
    if (provider === 'gemini') {
      const geminiModel = model || 'gemini-3-flash-preview';
      const base = (customBaseUrl || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
      const url = `${base}/models/${geminiModel}:streamGenerateContent?key=${apiKey}`;

      const contents = messages.map((msg: any) => {
        const parts: any[] = [{ text: msg.content }];
        if (msg.attachments && msg.attachments.length > 0) {
          msg.attachments.forEach((att: any) => {
            if (att.type.startsWith('image/')) {
              parts.push({
                inline_data: {
                  mime_type: att.type,
                  data: att.url.split(',')[1]
                }
              });
            }
          });
        }
        return {
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts
        };
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents,
          systemInstruction: { parts: [{ text: finalSystemPrompt }] }
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: { message: 'Gemini API Error' } }));
        return NextResponse.json({ error: err.error?.message || 'Gemini API Error' }, { status: response.status });
      }

      return new NextResponse(response.body);
    }

    // 2. OpenAI 兼容逻辑 (包括 Ollama, DeepSeek, Custom)
    let finalBaseUrl = "";
    
    if (customBaseUrl) {
      // 如果提供了自定义 URL，确保它以 /chat/completions 结尾（如果没写的话）
      finalBaseUrl = customBaseUrl.replace(/\/$/, '');
      if (!finalBaseUrl.endsWith('/chat/completions')) {
        // 兼容 Ollama 的 OpenAI 格式
        finalBaseUrl = `${finalBaseUrl}/chat/completions`;
      }
    } else {
      // 默认官方地址
      finalBaseUrl = provider === 'deepseek' 
        ? 'https://api.deepseek.com/chat/completions' 
        : 'https://api.openai.com/v1/chat/completions';
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(finalBaseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model || 'gpt-4o',
        messages: [
          { role: 'system', content: finalSystemPrompt },
          ...messages.map((m: any) => ({ role: m.role, content: m.content }))
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: { message: 'API Error' } }));
      return NextResponse.json({ error: err.error?.message || `API returned ${response.status}` }, { status: response.status });
    }

    return new NextResponse(response.body);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
