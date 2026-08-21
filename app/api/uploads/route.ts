import { NextRequest, NextResponse } from "next/server";
import { requireUserId, UnauthorizedError } from "@/lib/auth/require-user";
import { validateUploadedImage, ValidationError } from "@/lib/services/validator";

const MAX_REFERENCE_FILE_SIZE = Number(process.env.MAX_REFERENCE_FILE_SIZE ?? 5_242_880);

/**
 * Validates an uploaded reference image server-side (never trust client checks).
 * Returns the validated file as base64 for the client to attach to a generate request.
 */
export async function POST(req: NextRequest) {
  try {
    await requireUserId();

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    validateUploadedImage(
      { type: file.type, size: file.size, name: file.name },
      MAX_REFERENCE_FILE_SIZE
    );

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return NextResponse.json({
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      data: base64,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
