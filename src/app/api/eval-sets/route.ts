import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const app = searchParams.get('app');

  if (!app) {
    return NextResponse.json(
      { error: 'App parameter is required' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`http://localhost:8000/api/eval-sets?app=${app}`);
    if (!response.ok) {
      throw new Error('Failed to fetch evaluation sets');
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching evaluation sets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch evaluation sets' },
      { status: 500 }
    );
  }
} 