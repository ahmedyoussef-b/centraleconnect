// src/app/api/sync/clear/route.ts
import { NextResponse } from 'next/server';

export async function POST() {
    return NextResponse.json(
    { error: 'This API route is disabled. The application is designed to run in a Tauri environment and interact directly with the local database.' },
    { status: 404 }
  );
}
