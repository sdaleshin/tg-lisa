# tg-lisa

TypeScript Telegram client for listening to messages across all chats and channels.

## Installation

```bash
npm install tg-lisa
```

## Demo

Try the interactive demo application:

```bash
cd demo
npm install
cp .env.example .env
# Edit .env with your credentials from https://my.telegram.org
npm start
```

See [demo/README.md](demo/README.md) for more details.

## Usage

```typescript
import { TelegramClient } from 'tg-lisa';

const client = new TelegramClient({
  apiId: YOUR_API_ID,
  apiHash: 'YOUR_API_HASH',
  sessionFilePath: './telegram-session.txt', // Session will be saved to file
});

// Connect and authenticate
await client.connect();

// Get all chats
const chats = await client.getAllChats();
console.log(chats);

// Listen to messages from specific chat
client.addChatListener('CHAT_ID', (message) => {
  console.log(`New message: ${message.text}`);
});

// Remove listener
client.removeChatListener('CHAT_ID');
```

## API

### `TelegramClient(config)`

Create a new Telegram client instance.

**Config:**
- `apiId: number` - Telegram API ID
- `apiHash: string` - Telegram API hash
- `sessionFilePath?: string` - Path to file where session will be stored
- `sessionName?: string` - Manual session string (overrides sessionFilePath)

### `connect(): Promise<void>`

Authenticate and start the client session.

### `getAllChats(): Promise<TelegramChat[]>`

Get all available chats, channels, and groups.

### `addChatListener(chatId: string, handler: MessageHandler): void`

Subscribe to messages from a specific chat.

### `removeChatListener(chatId: string, handler?: MessageHandler): void`

Unsubscribe from chat messages. If no handler specified, removes all listeners for that chat.

### `disconnect(): Promise<void>`

Disconnect from Telegram.

### `getSessionString(): string`

Get session string for reuse in future connections.

## License

MIT

