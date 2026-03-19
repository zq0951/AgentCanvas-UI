import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages, model, apiKey, provider } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key is required' }, { status: 400 });
    }

    const systemPrompt = `You are NexusBoard AI. 
Every response MUST conclude with exactly 3 follow-up suggestions in the format: [NEXT: Label].
The labels should be short, actionable, and progress the current concept.`;

    // 1. 处理 Google Gemini 逻辑
    if (provider === 'gemini') {
      const geminiModel = model || 'gemini-1.5-pro';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:streamGenerateContent?key=${apiKey}`;

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
          systemInstruction: { parts: [{ text: systemPrompt }] }
        })
      });

      if (!response.ok) {
        const err = await response.json();
        return NextResponse.json({ error: err.error?.message || 'Gemini API Error' }, { status: response.status });
      }

      return new NextResponse(response.body);
    }

    // 2. OpenAI 兼容
    const baseUrl = provider === 'deepseek' ? 'https://api.deepseek.com/chat/completions' : 'https://api.openai.com/v1/chat/completions';

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((m: any) => ({ role: m.role, content: m.content }))
        ],
        stream: true,
      }),
    });

    return new NextResponse(response.body);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
