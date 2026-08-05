import { NextResponse } from "next/server";
import { getViewer, getWritableUser, PREVIEW_WRITE_ERROR } from "@/lib/viewer";
import { sanityClient } from "@/sanity/client";
import { sanityWriteClient, assertWriteClient } from "@/sanity/writeClient";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const avatarQuery = `*[_type == "userProfile" && contactId == $contactId][0]{ avatar }`;

// Documento por usuario con id determinístico para poder reemplazar la foto.
const profileDocId = (contactId: string) => `userProfile.${contactId}`;

export async function GET() {
  // Lectura: la previsualización necesita ver la foto del afiliado
  const user = await getViewer();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    // Sin CDN si hay token (lee la foto recién subida sin caché).
    const client = process.env.SANITY_API_WRITE_TOKEN
      ? sanityWriteClient
      : sanityClient;
    const result = await client.fetch<{ avatar?: unknown } | null>(avatarQuery, {
      contactId: user.contactId,
    });
    return NextResponse.json({ avatar: result?.avatar ?? null });
  } catch (err) {
    console.error("[/api/user/avatar] GET error:", err);
    return NextResponse.json({ avatar: null });
  }
}

export async function POST(request: Request) {
  try {
    assertWriteClient();
  } catch {
    return NextResponse.json(
      { error: "Servidor mal configurado (falta SANITY_API_WRITE_TOKEN)" },
      { status: 500 }
    );
  }

  // Escritura: solo el propio afiliado cambia su foto
  const user = await getWritableUser();
  if (!user) {
    const viewer = await getViewer();
    if (viewer?.isPreview) {
      console.warn(
        `[/api/user/avatar] Intento de subida en previsualización: ${viewer.previewedBy} sobre ${viewer.email}`
      );
      return NextResponse.json({ error: PREVIEW_WRITE_ERROR }, { status: 403 });
    }
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    const value = form.get("file");
    if (value instanceof File) file = value;
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json(
      { error: "No se recibió ningún archivo" },
      { status: 400 }
    );
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Formato no permitido. Usa JPG, PNG o WebP." },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "La imagen supera el tamaño máximo de 5MB." },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const asset = await sanityWriteClient.assets.upload("image", buffer, {
      filename: file.name,
      contentType: file.type,
    });

    const avatar = {
      _type: "image",
      asset: { _type: "reference", _ref: asset._id },
    };

    await sanityWriteClient.createOrReplace({
      _id: profileDocId(user.contactId),
      _type: "userProfile",
      email: user.email,
      contactId: user.contactId,
      avatar,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ avatar });
  } catch (err) {
    console.error("[/api/user/avatar] POST error:", err);
    return NextResponse.json(
      { error: "No se pudo subir la imagen" },
      { status: 502 }
    );
  }
}
