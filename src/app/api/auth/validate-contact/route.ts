import { NextResponse } from "next/server";
import { searchContactByEmail } from "@/lib/zoho";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body?.email?.trim();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email requerido" },
        { status: 400 }
      );
    }

    const contact = await searchContactByEmail(email);

    if (!contact) {
      return NextResponse.json(
        { success: false, exists: false, message: "Contacto no encontrado en el CRM" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      exists: true,
      contact: {
        id: contact.id,
        email: contact.Email,
        firstName: contact.First_Name,
        lastName: contact.Last_Name,
        fullName: contact.Full_Name,
      },
    });
  } catch (error) {
    console.error("[validate-contact]", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al validar contacto",
      },
      { status: 500 }
    );
  }
}
