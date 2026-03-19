import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { config } = body;
    
    if (!config) {
      return NextResponse.json({ error: 'Missing config' }, { status: 400 });
    }

    const { provider, apiKey, baseUrl } = config;
    let url = "";
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    // 1. Determine URL and Auth method based on provider
    if (provider === 'ollama') {
      url = `${baseUrl}/tags`;
    } else if (provider === 'gemini') {
      // Gemini uses API key in URL parameter
      const base = baseUrl.replace(/\/$/, '');
      url = `${base}/models?key=${apiKey}`;
    } else {
      // OpenAI or Custom: Use Bearer Token
      const base = baseUrl.replace(/\/$/, '');
      url = `${base}/models`;
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    console.log(`[API/Models] Fetching from: ${url}`);
    const response = await fetch(url, { headers, method: 'GET' });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({ 
        error: errorData.error?.message || `External API returned HTTP ${response.status}` 
      }, { status: response.status });
    }
    
    const data = await response.json();
    let models: string[] = [];

    // 2. Parse different data formats
    if (provider === 'ollama') {
      models = data.models?.map((m: any) => m.name) || [];
    } else if (provider === 'gemini') {
      // Gemini returns models array directly or inside models property
      const list = data.models || data;
      models = Array.isArray(list) ? list.map((m: any) => m.name.replace('models/', '')) : [];
    } else {
      // Standard OpenAI format: { data: [{ id: 'gpt-4' }, ...] }
      models = data.data?.map((m: any) => m.id) || [];
    }
    
    return NextResponse.json({ models: models.sort() });

  } catch (error: any) {
    console.error('[API/Models] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
