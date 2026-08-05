import { NextResponse } from "next/server";
import { getViewer } from "@/lib/viewer";

export async function GET() {
  const viewer = await getViewer();

  if (!viewer) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const { isPreview, previewedBy, ...user } = viewer;

  // `preview` alimenta el aviso de solo lectura y desactiva las acciones en
  // la interfaz. El bloqueo real vive en el servidor, no aquí.
  return NextResponse.json({
    user,
    preview: isPreview ? { previewedBy } : null,
  });
}
