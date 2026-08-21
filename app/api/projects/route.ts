import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId, UnauthorizedError } from "@/lib/auth/require-user";
import { PLATFORM_DEFINITIONS } from "@/lib/platforms/definitions";

const createSchema = z.object({
  name: z.string().trim().min(1).max(140),
  description: z.string().trim().min(1).max(4000),
  targetAudience: z.string().max(500).optional(),
  brandStyle: z.string().max(500).optional(),
  requiredPages: z.string().max(1000).optional(),
  features: z.string().max(1000).optional(),
  platform: z.enum(["SHOPIFY", "WORDPRESS", "PHP"]),
});

export async function GET() {
  try {
    const userId = await requireUserId();
    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ projects });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: "Unable to load projects." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid project details." }, { status: 400 });
    }
    if (!PLATFORM_DEFINITIONS[parsed.data.platform]) {
      return NextResponse.json({ error: "Unsupported platform." }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: { ...parsed.data, userId },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: "Unable to create project." }, { status: 500 });
  }
}
