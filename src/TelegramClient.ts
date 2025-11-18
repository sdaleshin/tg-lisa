import { TelegramClient as GramJSClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage, NewMessageEvent } from 'telegram/events';
import { Api } from 'telegram/tl';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import {
  TelegramClientConfig,
  TelegramMessage,
  TelegramChat,
  MessageHandler,
} from './types';

export class TelegramClient {
  private client: GramJSClient;
  private config: TelegramClientConfig;
  private listeners: Map<string, Set<MessageHandler>> = new Map();
  private isConnected: boolean = false;

  constructor(config: TelegramClientConfig) {
    this.config = config;
    
    let sessionString = config.sessionName || '';
    
    // If sessionFilePath is provided, try to read session from file
    if (config.sessionFilePath && !config.sessionName) {
      sessionString = this.readSessionFromFile(config.sessionFilePath);
    }
    
    const session = new StringSession(sessionString);
    this.client = new GramJSClient(session, config.apiId, config.apiHash, {
      connectionRetries: 5,
    });
  }

  /**
   * Authenticate and start the Telegram client session
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    await this.client.start({
      phoneNumber: async () => await this.input('Phone number: '),
      password: async () => await this.input('Password: '),
      phoneCode: async () => await this.input('Code: '),
      onError: (err) => console.error(err),
    });

    this.isConnected = true;
    this.setupGlobalListener();
    
    // Save session to file if sessionFilePath is provided
    if (this.config.sessionFilePath) {
      this.saveSessionToFile(this.config.sessionFilePath);
    }
  }

  /**
   * Read user input from console
   */
  private input(prompt: string): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }

  /**
   * Disconnect from Telegram
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }

  /**
   * Get the session string for reuse
   */
  getSessionString(): string {
    return this.client.session.save() as any as string;
  }

  /**
   * Retrieve all chats, channels, and groups
   */
  async getAllChats(): Promise<TelegramChat[]> {
    if (!this.isConnected) {
      throw new Error('Client is not connected. Call connect() first.');
    }

    const dialogs = await this.client.getDialogs({ limit: 100 });
    const chats: TelegramChat[] = [];

    for (const dialog of dialogs) {
      const entity = dialog.entity;
      
      if (!entity) continue;

      let chatType: 'private' | 'group' | 'channel';
      let title: string;
      let username: string | undefined;

      if (entity instanceof Api.User) {
        chatType = 'private';
        title = entity.firstName || '';
        if (entity.lastName) title += ` ${entity.lastName}`;
        username = entity.username;
      } else if (entity instanceof Api.Chat || entity instanceof Api.ChatForbidden) {
        chatType = 'group';
        title = entity.title;
      } else if (entity instanceof Api.Channel) {
        chatType = entity.broadcast ? 'channel' : 'group';
        title = entity.title;
        username = entity.username;
      } else {
        continue;
      }

      chats.push({
        id: dialog.id?.toString() || '',
        title,
        type: chatType,
        username,
      });
    }

    return chats;
  }

  /**
   * Add a message listener for a specific chat
   */
  addChatListener(chatId: string, handler: MessageHandler): void {
    if (!this.listeners.has(chatId)) {
      this.listeners.set(chatId, new Set());
    }
    this.listeners.get(chatId)!.add(handler);
  }

  /**
   * Remove a message listener for a specific chat
   */
  removeChatListener(chatId: string, handler?: MessageHandler): void {
    if (!handler) {
      this.listeners.delete(chatId);
      return;
    }

    const handlers = this.listeners.get(chatId);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(chatId);
      }
    }
  }

  /**
   * Setup global message listener
   */
  private setupGlobalListener(): void {
    this.client.addEventHandler(
      async (event: NewMessageEvent) => {
        const message = event.message;
        const chatId = message.chatId?.toString();

        if (!chatId) return;

        const handlers = this.listeners.get(chatId);
        if (!handlers || handlers.size === 0) return;

        const telegramMessage = await this.convertToTelegramMessage(message, chatId);

        for (const handler of handlers) {
          try {
            await handler(telegramMessage);
          } catch (error) {
            console.error('Error in message handler:', error);
          }
        }
      },
      new NewMessage({})
    );
  }

  /**
   * Convert GramJS message to TelegramMessage
   */
  private async convertToTelegramMessage(
    message: Api.Message,
    chatId: string
  ): Promise<TelegramMessage> {
    let senderName: string | undefined;
    const senderId = message.senderId?.toString();

    // Try to get sender info from message.sender first
    if (message.sender) {
      const sender = message.sender;
      if (sender instanceof Api.User) {
        senderName = sender.firstName || '';
        if (sender.lastName) senderName += ` ${sender.lastName}`;
      } else if (sender instanceof Api.Channel || sender instanceof Api.Chat) {
        senderName = sender.title;
      }
    } 
    // If sender info is not available, try to fetch it
    else if (message.senderId) {
      try {
        const entity = await this.client.getEntity(message.senderId);
        if (entity instanceof Api.User) {
          senderName = entity.firstName || '';
          if (entity.lastName) senderName += ` ${entity.lastName}`;
        } else if (entity instanceof Api.Channel || entity instanceof Api.Chat) {
          senderName = entity.title;
        }
      } catch (error) {
        // If we can't fetch sender info, leave it undefined
        console.debug('Could not fetch sender info:', error);
      }
    }

    return {
      id: message.id,
      chatId,
      text: message.text || '',
      date: new Date(message.date * 1000),
      senderId,
      senderName,
    };
  }

  /**
   * Read session string from file
   */
  private readSessionFromFile(filePath: string): string {
    try {
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf-8').trim();
      }
    } catch (error) {
      console.warn(`Failed to read session from file: ${filePath}`, error);
    }
    return '';
  }

  /**
   * Save session string to file
   */
  private saveSessionToFile(filePath: string): void {
    try {
      const sessionString = this.getSessionString();
      const dir = path.dirname(filePath);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, sessionString, 'utf-8');
    } catch (error) {
      console.error(`Failed to save session to file: ${filePath}`, error);
    }
  }
}

