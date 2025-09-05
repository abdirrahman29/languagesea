// Fixed app/api/process-text/route.ts - Proper parameter validation
import { NextRequest, NextResponse } from "next/server"
import { processText } from "@/lib/text-processor"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    // Get the session to validate the user
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized - please log in" },
        { status: 401 }
      )
    }

    // Parse the request body
    const body = await request.json()
    const { text, title, userId } = body

    // Validate required parameters
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: "Text is required and must be a string" },
        { status: 400 }
      )
    }

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: "Title is required and must be a string" },
        { status: 400 }
      )
    }

    // Use userId from request body if provided, otherwise use session user id
    const validUserId = userId || session.user.id

    if (!validUserId || typeof validUserId !== 'string') {
      return NextResponse.json(
        { error: "Valid userId is required" },
        { status: 400 }
      )
    }

    // Security check: ensure user can only process their own texts
    if (validUserId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden - can only process your own texts" },
        { status: 403 }
      )
    }

    console.log('Processing text for user:', validUserId)
    console.log('Text length:', text.length)
    console.log('Title:', title)

    // Process the text
    const result = await processText(text, title, validUserId)

    return NextResponse.json({
      success: true,
      result
    })

  } catch (error) {
    console.error("Error in process-text API route:", error)
    
    // Return appropriate error response
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    const statusCode = errorMessage.includes('required') || errorMessage.includes('Invalid') ? 400 : 500
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage 
      },
      { status: statusCode }
    )
  }
}

// Optional: Add GET method for health check
export async function GET() {
  return NextResponse.json({ 
    message: "Process text API is running",
    timestamp: new Date().toISOString()
  })
}