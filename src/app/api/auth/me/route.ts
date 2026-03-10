import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { parseSessionCookie, SESSION_COOKIE } from "@/lib/session";

export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionCookie) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = parseSessionCookie(sessionCookie);

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({ user });
}
