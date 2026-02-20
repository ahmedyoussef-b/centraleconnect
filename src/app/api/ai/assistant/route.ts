
import { NextResponse } from 'next/server';
import { askAssistant, type AssistantInput } from '@/ai/flows/assistant-flow';

export async function POST(req: Request) {
  try {
    const body: AssistantInput = await req.json();
    const result = await askAssistant(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API Assistant] Error:', error);
    return NextResponse.json({ error: 'Failed to process assistant request', details: error.message }, { status: 500 });
  }
}
