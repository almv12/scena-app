export default async function handler(request, response) {
  if (request.method === 'POST') {
    const { message } = request.body;

    if (message && message.text === '/start') {
      const botToken = process.env.BOT_TOKEN;
      const chatId = message.chat.id;
      const firstName = message.from.first_name;

      const text = `Привет, ${firstName}! 👋\nДобро пожаловать в Scena App.\n\nНажми на кнопку ниже, чтобы открыть свое расписание.`;

      // Отправляем ответ в Telegram
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          reply_markup: {
            inline_keyboard: [[
              { text: "Открыть приложение", web_app: { url: "https://scena-app-proba.vercel.app/" } }
            ]]
          }
        }),
      });
    }

    response.status(200).send('OK');
  } else {
    response.status(200).send('Use POST');
  }
}
