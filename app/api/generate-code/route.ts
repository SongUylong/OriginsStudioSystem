import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/authOptions";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Fetch the user from the database using the email from the session.
    // A user must exist in the database to generate a connection link.
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }, // We only need the user's ID.
    });

    // If no user is found with that email, return a "Not Found" error.
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Use the user's unique ID as the secure connection code for the Telegram bot.
    const connectionCode = user.id;
    console.log(connectionCode);
    // Retrieve the bot's username from environment variables.
    // This is more secure and flexible than hardcoding it.
    const botUsername = process.env.TELEGRAM_BOT_USERNAME;

    // If the environment variable is not set, log an error and inform the client.
    if (!botUsername) {
      console.error("TELEGRAM_BOT_USERNAME environment variable is not set.");
      return NextResponse.json(
        { error: "Service configuration is incomplete." },
        { status: 500 }
      );
    }

    // Construct the Telegram deep link with the bot username and the user's unique code.
    const link = `https://t.me/${botUsername}?start=${connectionCode}`;
    // Return the generated link in the response.
    return NextResponse.json({ link });
  } catch (error) {
    // Log any unexpected errors that occur during the process.
    console.error("Telegram link generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate link." },
      { status: 500 }
    );
  }
}
