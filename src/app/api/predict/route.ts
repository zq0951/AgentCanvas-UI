import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { context, prompt, model, provider, apiKey, baseUrl } = await req.json();

    // 实际生产中，这里应该调用 LLM (如 Gemini/GPT) 并使用一个简短的提示词：
    // "Based on this conversation: [context], suggest 3 very short next steps for the user. Output as a JSON array of strings."
    
    // 这里模拟 API 返回结果
    const mockSuggestions = [
      "深入分析细节",
      "生成对比图表",
      "总结核心观点",
      "导出为 PDF"
    ];

    // 如果你有实际的 LLM 调用代码，可以集成在这里。
    // 为了演示，我们先返回模拟数据。
    
    return NextResponse.json({ suggestions: mockSuggestions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
