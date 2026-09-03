import { NextResponse } from 'next/server';

let mockDateOverride: string | null = null;

export function getMockDate(): Date {
  return mockDateOverride ? new Date(mockDateOverride) : new Date();
}

export async function GET() {
  const mockDate = mockDateOverride || new Date().toISOString();
  return NextResponse.json({ mockDate, isOverridden: mockDateOverride !== null });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.mockDate) {
      mockDateOverride = new Date(body.mockDate).toISOString();
      return NextResponse.json({ mockDate: mockDateOverride, isOverridden: true, message: 'Mock time updated' });
    }
    if (body.hours) {
      const current = new Date(mockDateOverride || new Date().toISOString());
      current.setHours(current.getHours() + body.hours);
      mockDateOverride = current.toISOString();
      return NextResponse.json({ mockDate: mockDateOverride, isOverridden: true, message: `Mock time advanced by ${body.hours} hours` });
    }
    return NextResponse.json({ error: 'Falta mockDate u horas' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: 'Formato de fecha inválido' }, { status: 400 });
  }
}

export async function DELETE() {
  mockDateOverride = null;
  return NextResponse.json({ mockDate: new Date().toISOString(), isOverridden: false, message: 'Mock time restablecido' });
}
