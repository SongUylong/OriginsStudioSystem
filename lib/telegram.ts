type ParseMode = "Markdown" | "MarkdownV2" | "HTML" | null | undefined;

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options?: {
    parseMode?: ParseMode;
    replyMarkup?: any;
    disablePreview?: boolean;
  }
) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN is not set");

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const payload: any = {
    chat_id: chatId,
    text,
  };

  const parseMode =
    options?.parseMode === undefined ? "Markdown" : options?.parseMode;
  if (parseMode) payload.parse_mode = parseMode;
  if (options?.replyMarkup) payload.reply_markup = options.replyMarkup;
  if (options?.disablePreview !== undefined)
    payload.disable_web_page_preview = options.disablePreview;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(
        `Telegram API error (${data.error_code}): ${data.description}`
      );
    }

    return data;
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
    throw error;
  }
}
