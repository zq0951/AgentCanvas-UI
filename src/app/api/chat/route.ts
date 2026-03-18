import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { config, messages } = body;
    
    if (!config || !messages) {
      return NextResponse.json({ error: 'Missing config or messages' }, { status: 400 });
    }

    const { provider, apiKey, baseUrl, model } = config;
    let endpoint = '';
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    let payload: any = {};

    // 1. Format Request based on Provider
    if (provider === 'ollama') {
      endpoint = `${baseUrl}/chat`;
      payload = {
        model: model,
        messages: messages,
        stream: false
      };
    } 
    else if (provider === 'gemini') {
      const base = baseUrl.replace(/\/$/, '');
      endpoint = `${base}/models/${model}:generateContent?key=${apiKey}`;
      // Map OpenAI messages to Gemini format
      payload = {
        contents: messages.map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        }))
      };
    } 
    else {
      // OpenAI & Custom (DeepSeek, etc.)
      const base = baseUrl.replace(/\/$/, '');
      endpoint = `${base}/chat/completions`;
      headers['Authorization'] = `Bearer ${apiKey}`;
      payload = {
        model: model,
        messages: messages,
      };
    }

    // 2. Fetch from External API
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API Error ${response.status}: ${err}`);
    }

    const data = await response.json();
    let replyText = '';

    // 3. Normalize Response to common format
    if (provider === 'ollama') {
      replyText = data.message?.content || '';
    } else if (provider === 'gemini') {
      replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      replyText = data.choices?.[0]?.message?.content || '';
    }

    return NextResponse.json({ text: replyText });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
