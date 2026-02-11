// src/app/api/components/route.ts
import { NextResponse } from 'next/server';
import componentsData from '@/assets/master-data/pupitre-data.json';
import type { Component } from '@/types/db';

export async function GET() {
  try {
    // These components are for the synoptic view and are sourced from a static JSON file.
    const components = componentsData.components as Component[];
    return NextResponse.json(components);
  } catch (error) {
    console.error("Failed to read component data from JSON", error);
    return NextResponse.json(
      { error: 'Failed to fetch components' },
      { status: 500 }
    );
  }
}
