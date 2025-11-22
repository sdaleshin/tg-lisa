import { TgLisa } from './src';

async function main() {
  // Initialize client
  const client = new TgLisa({
    apiId: 12345, // Replace with your API ID from https://my.telegram.org
    apiHash: 'your_api_hash', // Replace with your API hash
    sessionFilePath: './telegram-session.txt', // Session will be saved to file
  });

  try {
    // Connect and authenticate
    console.log('Connecting to Telegram...');
    await client.connect();
    console.log('Connected successfully!');
    console.log('Session saved to telegram-session.txt');

    // Get all available chats
    const chats = await client.getAllChats();
    console.log(`Found ${chats.length} chats:`);
    chats.forEach((chat) => {
      console.log(`- ${chat.title} (${chat.type}) [ID: ${chat.id}]`);
    });

    // Listen to messages from a specific chat
    if (chats.length > 0) {
      const firstChat = chats[0];
      console.log(`\nListening to messages from: ${firstChat.title}`);

      client.addChatListener(firstChat.id, async (message) => {
        const senderName = message.senderId?.toString() || 'Unknown';
        console.log(`[${senderName}]: ${message.text}`);
      });
    }

    // Keep the process running
    console.log('\nListening for messages... Press Ctrl+C to exit');
    await new Promise(() => {}); // Keep alive
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.disconnect();
  }
}

main();

