import { NextRequest, NextResponse } from "next/server";
import { sendTelegramMessage } from "@/lib/telegram";
import { db } from "@/lib/db";

const funnyMessages = [
  "Hey {name}, your tasks are calling you! 📞",
  "{name}, don't make your tasks miss you too much! 😜",
  "Time to update your tasks, {name}! Or the coffee gets it! ☕️😱",
  "{name}, your tasks are like plants. Water them today! 🌱",
  "If you update your tasks, you get a virtual high five, {name}! 🙌",
  "{name}, procrastination level: expert. Let's break the streak! 🚀",
  "Tasks won't update themselves, {name}. Or will they? 🤔",
  "{name}, your tasks are starting to gossip about you... 🗣️",
  "Update your tasks, {name}, and the universe will thank you! 🌌",
  "{name}, your tasks are waiting like puppies at the door! 🐶",
  "Don't let your tasks get lonely, {name}! 🥲",
  "{name}, rumor has it you love updating tasks! Prove it! 😏",
  "Tasks are like pizza, {name}. Best served fresh! 🍕",
  "{name}, if you update your tasks, you get +10 productivity points! 🏆",
  "Your tasks wrote a song about you, {name}. Update to hear it! 🎶",
  "{name}, your tasks are practicing their puppy eyes... 🥺",
  "Update your tasks, {name}, or face the tickle monster! 👾",
  "{name}, your tasks are more patient than your WiFi. But not by much! 📶",
  "If you update your tasks, you unlock a secret achievement, {name}! 🥇",
  "{name}, your tasks are sending you good vibes. Send some back! ✨",
];

export async function GET(request: NextRequest) {
  try {
    // Exclude managers from receiving the generic "update your tasks" reminder
    const managerUserIds = [
      "cme8bv80n00000swo16enzbxp",
      "cme8bv89h00010swo8kk9gus7",
    ];

    const users = await db.user.findMany({
      where: {
        telegramChatId: { not: null },
        id: { notIn: managerUserIds },
      },
      select: { telegramChatId: true, name: true },
    });

    // Get today's cleaner based on current date
    const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
    const cleaningSchedule = {
      Monday: "Eric",
      Tuesday: "Davin",
      Wednesday: "Bovy",
      Thursday: "Liya",
      Friday: "Bosba",
    };

    const todayCleaner =
      cleaningSchedule[today as keyof typeof cleaningSchedule];

    const sendMessages = users.map(
      async (user: { telegramChatId: string | null; name: string }) => {
        const chatId = user.telegramChatId;
        // Pick a random message and replace {name} with user's name
        const messageTemplate =
          funnyMessages[Math.floor(Math.random() * funnyMessages.length)];
        const baseMessage = messageTemplate.replace(
          "{name}",
          user.name || "there"
        );

        // Add today's cleaning reminder
        const fullMessage = `${baseMessage}\n\n🧹 Today is ${today} - ${todayCleaner} cleaning! Don't forget your tasks! ✨`;

        if (!chatId || !fullMessage) {
          console.error("chatId and message are required for user:", user);
          return;
        }

        try {
          const result = await sendTelegramMessage(chatId, fullMessage);
          console.log("Message sent to", user.name, result);
        } catch (error) {
          console.error("Failed to send message to", user.name, error);
        }
      }
    );
    // Wait for all messages to finish
    await Promise.all(sendMessages);

    return NextResponse.json({
      success: true,
      message: "Telegram messages sent successfully",
      todayCleaner,
      result: users,
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
