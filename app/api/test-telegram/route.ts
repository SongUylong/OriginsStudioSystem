import { NextRequest, NextResponse } from "next/server";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chatId, message } = body;

    if (!chatId || !message) {
      return NextResponse.json(
        { error: "chatId and message are required" },
        { status: 400 }
      );
    }

    console.log("🧪 Testing Telegram message sending...");
    console.log("- Test Chat ID:", chatId);
    console.log("- Test Message:", message);

    const result = await sendTelegramMessage(chatId, message);

    return NextResponse.json({
      success: true,
      message: "Telegram message sent successfully",
      result,
    });
  } catch (error) {
    console.error("❌ Test Telegram endpoint error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        details: error,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check environment variables
export async function GET() {
  const chatId = "1000901678";
  const message = "Hello, this is a test message";
  try {
    if (!chatId || !message) {
      return NextResponse.json(
        { error: "chatId and message are required" },
        { status: 400 }
      );
    }
    const result = await sendTelegramMessage(chatId, message);

    return NextResponse.json({
      success: true,
      message: "Telegram message sent successfully",
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        details: error,
      },
      { status: 500 }
    );
  }
}
