export interface TelegramClientConfig {
  apiId: number;
  apiHash: string;
  sessionName?: string;
  sessionFilePath?: string;
}

export interface TelegramMessage {
  id: number;
  chatId: string;
  text: string;
  date: Date;
  senderId?: string;
  senderName?: string;
}

export interface TelegramChat {
  id: string;
  title: string;
  type: 'private' | 'group' | 'channel';
  username?: string;
}

export type MessageHandler = (message: TelegramMessage) => void | Promise<void>;

