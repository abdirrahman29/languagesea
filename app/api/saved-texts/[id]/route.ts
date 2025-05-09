import { type NextRequest, NextResponse } from "next/server"
import { fetchSavedTextById } from "@/lib/data-service"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get("userId")
    const textId = Number.parseInt(params.id)

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    if (isNaN(textId)) {
      return NextResponse.json({ error: "Invalid text ID" }, { status: 400 })
    }

    const savedText = await fetchSavedTextById(textId, userId)

    if (!savedText) {
      return NextResponse.json({ error: "Text not found" }, { status: 404 })
    }

    return NextResponse.json(savedText)
  } catch (error) {
    console.error("Error fetching saved text:", error)
    return NextResponse.json({ error: "Failed to fetch saved text" }, { status: 500 })
  }
}
import { prisma } from "@/lib/db";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const textId = Number(params.id);
    if (isNaN(textId)) {
      return NextResponse.json(
        { error: "Invalid text ID format" },
        { status: 400 }
      );
    }

    // Get userId from request body
    const body = await req.json();
    const userId = body.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify text ownership
    const text = await prisma.savedText.findFirst({
      where: {
              // @ts-ignore

        id: textId,
        userId: userId
      }
    });

    if (!text) {
      return NextResponse.json({ error: "Text not found" }, { status: 404 });
    }

    // Delete the text and related records
    await prisma.savedText.delete({
            // @ts-ignore

      where: { id: textId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE_TEXT_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}