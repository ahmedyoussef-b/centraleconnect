// src/app/api/components/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { error: 'This API route is disabled. The application is designed to run in a Tauri environment and interact directly with the local database.' },
    { status: 404 }
  );
}
