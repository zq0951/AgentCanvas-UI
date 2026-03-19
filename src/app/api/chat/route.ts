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
          type: { type: "string", enum: ["bar", "line", "pie"], description: "The type of chart to render." },
          xAxisKey: { type: "string", description: "The key to use for the X-axis (e.g., 'month', 'category')." },
          keys: { type: "array", items: { type: "string" }, description: "The data keys to plot (e.g., ['revenue', 'profit'])." },
          data: { 
            type: "array", 
            items: { type: "object" },
            description: "The actual data points." 
          }
        },
        required: ["type", "xAxisKey", "keys", "data"]
      }
    };

    const defaultSystemPrompt = `You are NexusBoard AI. 
Every response MUST conclude with exactly ${zeroFrictionCount} follow-up suggestions in the format: [NEXT: Label].
The labels should be short, actionable, and progress the current concept.

PRIORITY: Use the 'generate_chart' tool for any data visualization.
NEVER output raw code like 'print(generate_chart(...))' in the text. 
If tools fail, ONLY use this exact markdown format:
\`\`\`json:chart
{
  "type": "bar" | "line" | "pie",
  "xAxisKey": "name",
  "keys": ["value1"],
  "data": [{"name": "A", "value1": 10}]
}
\`\`\``;

    const finalSystemPrompt = userSystemPrompt 
      ? `${userSystemPrompt}\n\nIMPORTANT: Every response MUST conclude with exactly ${zeroFrictionCount} follow-up suggestions in the format: [NEXT: Label].`
      : defaultSystemPrompt;

    // 1. 处理 Google Gemini 逻辑
    if (provider === 'gemini') {
      const geminiModel = model || 'gemini-2.0-flash';
      const base = (customBaseUrl || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
      const url = `${base}/models/${geminiModel}:streamGenerateContent?key=${apiKey}`;

      // 修复：Gemini contents 严禁包含 system 角色，必须过滤
      const filteredMessages = messages.filter((m: any) => m.role !== 'system');

      const contents = filteredMessages.map((msg: any) => {
        const parts: any[] = [{ text: msg.content }];
        if (msg.attachments && msg.attachments.length > 0) {
          msg.attachments.forEach((att: any) => {
            if (att.type.startsWith('image/')) {
              parts.push({
                inline_data: { mime_type: att.type, data: att.url.split(',')[1] }
              });
            }
          });
        }
        return { role: msg.role === 'assistant' ? 'model' : 'user', parts };
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents,
          systemInstruction: { parts: [{ text: finalSystemPrompt }] },
          tools: [{ function_declarations: [chartTool] }],
          tool_config: { function_calling_config: { mode: "AUTO" } }
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error('Gemini API Details:', err);
        return NextResponse.json({ 
          error: err.error?.message || err[0]?.error?.message || 'Gemini API Error',
          details: err
        }, { status: response.status });
      }

      return new NextResponse(response.body);
    }

    // 2. OpenAI 兼容逻辑
    let finalBaseUrl = "";
    if (customBaseUrl) {
      finalBaseUrl = customBaseUrl.replace(/\/$/, '');
      if (!finalBaseUrl.endsWith('/chat/completions')) finalBaseUrl = `${finalBaseUrl}/chat/completions`;
    } else {
      finalBaseUrl = provider === 'deepseek' 
        ? 'https://api.deepseek.com/chat/completions' 
        : 'https://api.openai.com/v1/chat/completions';
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const response = await fetch(finalBaseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model || 'gpt-4o',
        messages: [
          { role: 'system', content: finalSystemPrompt },
          ...messages.map((m: any) => ({ role: m.role, content: m.content }))
        ],
        tools: [{ type: "function", function: chartTool }],
        tool_choice: "auto",
        stream: true,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return NextResponse.json({ error: err.error?.message || `API returned ${response.status}` }, { status: response.status });
    }

    return new NextResponse(response.body);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
