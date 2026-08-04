import { NextResponse } from "next/server";
import { requireActiveAdmin } from "@/lib/admin";

export async function GET() {
  const admin = await requireActiveAdmin();

  if (!admin) {
    return NextResponse.json({ admin: null }, { status: 401 });
  }

  return NextResponse.json({ admin });
}
