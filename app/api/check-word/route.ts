import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const baseForm = url.searchParams.get("baseForm")
    const type = url.searchParams.get("type")

    if (!baseForm || !type) {
      return NextResponse.json({ error: "Base form and type are required" }, { status: 400 })
    }

    let exists = false

    // Check if the word exists in the appropriate table
    if (type === "VERB") {
      const verb = await prisma.verb.findFirst({
        where: {
          baseForm: {
            equals: baseForm,
            mode: "insensitive",
          },
        },
      })
      exists = !!verb
    } else if (type === "NOUN") {
      const noun = await prisma.noun.findFirst({
        where: {
          baseForm: {
            equals: baseForm,
            mode: "insensitive",
          },
        },
      })
      exists = !!noun
    } else if (type === "ADJ") {
      const adjective = await prisma.adjective.findFirst({
        where: {
          baseForm: {
            equals: baseForm,
            mode: "insensitive",
          },
        },
      })
      exists = !!adjective
    }

    return NextResponse.json({ exists })
  } catch (error) {
    console.error("Error checking word existence:", error)
    return NextResponse.json({ error: "Failed to check word existence" }, { status: 500 })
  }
}
