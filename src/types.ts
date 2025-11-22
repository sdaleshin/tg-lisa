import { Api } from 'telegram/tl';

export interface TelegramClientConfig {
  apiId: number;
  apiHash: string;
  sessionName?: string;
  sessionFilePath?: string;
}

export type TelegramMessage = Api.Message;

export interface TelegramChat {
  id: string;
  title: string;
  type: 'private' | 'group' | 'channel';
  username?: string;
}

export type MessageHandler = (message: TelegramMessage) => void | Promise<void>;

