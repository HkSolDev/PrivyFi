import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
  }

  const apiKey = process.env.ZERION_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'Zerion API key not configured' }, { status: 500 });
  }

  try {
    // Zerion V1 Portfolio API
    const response = await fetch(
      `https://api.zerion.io/v1/wallets/${address}/portfolio`,
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          authorization: `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message || 'Failed to fetch portfolio from Zerion' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Zerion API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
