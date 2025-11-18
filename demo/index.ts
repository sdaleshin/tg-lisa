import * as dotenv from 'dotenv';
import { TelegramClient, TelegramChat } from 'tg-lisa';

dotenv.config();

async function main() {
  console.log('🚀 Starting Telegram Client Demo\n');

  const apiId = parseInt(process.env.TELEGRAM_API_ID || '0');
  const apiHash = process.env.TELEGRAM_API_HASH || '';

  if (!apiId || !apiHash) {
    console.error('❌ Error: TELEGRAM_API_ID and TELEGRAM_API_HASH must be set in .env file');
    console.log('\n📝 Please:');
    console.log('1. Copy .env.example to .env');
    console.log('2. Fill in your credentials from https://my.telegram.org');
    process.exit(1);
  }

  const client = new TelegramClient({
    apiId,
    apiHash,
    sessionFilePath: './telegram-session.txt',
  });

  try {
    // Connect and authenticate
    console.log('🔐 Connecting to Telegram...');
    await client.connect();
    console.log('✅ Connected successfully!');
    console.log('💾 Session saved to telegram-session.txt\n');

    // Get all chats
    console.log('📋 Fetching all chats...');
    const chats = await client.getAllChats();
    console.log(`✅ Found ${chats.length} chats:\n`);

    // Display chats grouped by type
    displayChats(chats);

    // Ask user which chat to monitor
    const selectedChat = await selectChat(chats);
    
    if (!selectedChat) {
      console.log('\n👋 No chat selected. Exiting...');
      await client.disconnect();
      return;
    }

    // Listen to messages from selected chat
    console.log(`\n👂 Listening to messages from: ${selectedChat.title}`);
    console.log('Press Ctrl+C to stop\n');

    client.addChatListener(selectedChat.id, async (message) => {
      const timestamp = message.date.toLocaleTimeString();
      const sender = message.senderName || 'Unknown';
      console.log(`[${timestamp}] ${sender}: ${message.text}`);
    });

    // Keep the process running
    await new Promise(() => {});
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    console.log('\n🔌 Disconnecting...');
    await client.disconnect();
    console.log('👋 Goodbye!');
  }
}

function displayChats(chats: TelegramChat[]) {
  const groups = {
    private: chats.filter(c => c.type === 'private'),
    group: chats.filter(c => c.type === 'group'),
    channel: chats.filter(c => c.type === 'channel'),
  };

  if (groups.private.length > 0) {
    console.log('👤 Private Chats:');
    groups.private.slice(0, 10).forEach((chat) => {
      const username = chat.username ? ` (@${chat.username})` : '';
      console.log(`   [ID: ${chat.id}] ${chat.title}${username}`);
    });
    if (groups.private.length > 10) {
      console.log(`   ... and ${groups.private.length - 10} more`);
    }
    console.log();
  }

  if (groups.group.length > 0) {
    console.log('👥 Groups:');
    groups.group.slice(0, 10).forEach((chat) => {
      const username = chat.username ? ` (@${chat.username})` : '';
      console.log(`   [ID: ${chat.id}] ${chat.title}${username}`);
    });
    if (groups.group.length > 10) {
      console.log(`   ... and ${groups.group.length - 10} more`);
    }
    console.log();
  }

  if (groups.channel.length > 0) {
    console.log('📢 Channels:');
    groups.channel.slice(0, 10).forEach((chat) => {
      const username = chat.username ? ` (@${chat.username})` : '';
      console.log(`   [ID: ${chat.id}] ${chat.title}${username}`);
    });
    if (groups.channel.length > 10) {
      console.log(`   ... and ${groups.channel.length - 10} more`);
    }
    console.log();
  }
}

async function selectChat(chats: TelegramChat[]): Promise<TelegramChat | null> {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('\n📝 Enter chat ID to monitor (or press Enter to use first chat): ', (answer: string) => {
      rl.close();
      
      if (!answer.trim()) {
        resolve(chats[0] || null);
        return;
      }

      const chatId = answer.trim();
      const selectedChat = chats.find(chat => chat.id === chatId);
      
      if (!selectedChat) {
        console.log('❌ Chat with this ID not found');
        resolve(null);
        return;
      }

      resolve(selectedChat);
    });
  });
}

main().catch(console.error);

