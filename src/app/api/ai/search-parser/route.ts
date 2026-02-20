
import { NextResponse } from 'next/server';
import { parseSearchQuery, type SearchQueryInput } from '@/ai/flows/search-parser-flow';

export async function POST(req: Request) {
  try {
    const body: SearchQueryInput = await req.json();
    const result = await parseSearchQuery(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API Search Parser] Error:', error);
    return NextResponse.json({ error: 'Failed to parse search query', details: error.message }, { status: 500 });
  }
}
