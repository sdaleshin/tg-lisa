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
import { TgLisa } from 'tg-lisa';

const client = new TgLisa({
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
  // message is Api.Message from telegram/tl
  // You have full access to all message properties
  console.log(`New message: ${message.text}`);
  console.log(`Sender ID: ${message.senderId}`);
  console.log(`Date: ${message.date}`);
  console.log(`Message ID: ${message.id}`);
});

// Remove listener
client.removeChatListener('CHAT_ID');
```

## API

### `TgLisa(config)`

Create a new Telegram client instance.

**Config:**
- `apiId: number` - Telegram API ID from https://my.telegram.org
- `apiHash: string` - Telegram API hash from https://my.telegram.org
- `sessionFilePath?: string` - Path to file where session will be stored
- `sessionName?: string` - Manual session string (overrides sessionFilePath)

### `connect(): Promise<void>`

Authenticate and start the client session. Will prompt for phone number and verification code on first run.

### `getAllChats(): Promise<TelegramChat[]>`

Get all available chats, channels, and groups.

**Returns:** Array of `TelegramChat` objects with properties:
- `id: string` - Unique chat identifier
- `title: string` - Chat name or title
- `type: 'private' | 'group' | 'channel'` - Chat type
- `username?: string` - Username if available

### `addChatListener(chatId: string, handler: MessageHandler): void`

Subscribe to messages from a specific chat.

**Parameters:**
- `chatId: string` - Chat ID to listen to
- `handler: (message: TelegramMessage) => void | Promise<void>` - Callback function that receives `Api.Message` objects

**Note:** `TelegramMessage` is an alias for `Api.Message` from telegram/tl, giving you full access to all message properties including text, media, reactions, and more.

### `removeChatListener(chatId: string, handler?: MessageHandler): void`

Unsubscribe from chat messages.

**Parameters:**
- `chatId: string` - Chat ID to stop listening to
- `handler?: MessageHandler` - Specific handler to remove. If omitted, removes all handlers for the chat.

### `disconnect(): Promise<void>`

Disconnect from Telegram and clean up resources.

### `getSessionString(): string`

Get the current session string for reuse in future connections.

**Returns:** Session string that can be used with `sessionName` config option.

## Types

### `TelegramMessage`

Type alias for `Api.Message` from telegram/tl. Provides full access to all Telegram message properties.

### `TelegramChat`

```typescript
interface TelegramChat {
  id: string;
  title: string;
  type: 'private' | 'group' | 'channel';
  username?: string;
}
```

### `TelegramClientConfig`

```typescript
interface TelegramClientConfig {
  apiId: number;
  apiHash: string;
  sessionName?: string;
  sessionFilePath?: string;
}
```

### `MessageHandler`

```typescript
type MessageHandler = (message: TelegramMessage) => void | Promise<void>;
```

## License

MIT

