import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.message?.text && body.message?.chat?.id) {
      const chatId = body.message.chat.id.toString();
      const text: string = body.message.text;

      if (text.startsWith("/start ")) {
        // Extract the unique user ID (connection code) from the command
        const userId = text.split(" ")[1];

        const user = await db.user.findUnique({
          where: { id: userId },
        });

        if (user) {
          await db.user.update({
            where: { id: userId },
            data: { telegramChatId: chatId },
          });

          // Send a success message back to the user on Telegram
          await sendTelegramMessage(
            chatId,
            "✅ Success! Your Telegram account is now connected. You will receive notifications here."
          );
        } else {
          // User not found, the connection code is invalid
          await sendTelegramMessage(
            chatId,
            "❌ Error: Invalid connection code. Please generate a new link from your dashboard."
          );
        }
      }
      // Scenario 2: User sends just `/start`
      else if (text === "/start") {
        await sendTelegramMessage(
          chatId,
          "👋 Welcome! To connect your account, please click the unique link generated from your dashboard."
        );
      }
    }
  } catch (error) {
    // Log any unexpected errors for debugging purposes
    console.error("Telegram Webhook Error:", error);
  } finally {
    return NextResponse.json({ status: "ok" });
  }
}
