import { TelegramClient } from '../TelegramClient';
import { TelegramClientConfig, MessageHandler } from '../types';

// Mock telegram library
jest.mock('telegram', () => {
  const mockSession = {
    save: jest.fn().mockReturnValue('mock_session_string'),
  };

  const mockClient = {
    start: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    getDialogs: jest.fn(),
    addEventHandler: jest.fn(),
    session: mockSession,
  };

  class MockUser {
    firstName: string;
    lastName?: string;
    username?: string;
    constructor(data: any) {
      this.firstName = data.firstName;
      this.lastName = data.lastName;
      this.username = data.username;
    }
  }

  class MockChat {
    title: string;
    constructor(data: any) {
      this.title = data.title;
    }
  }

  class MockChatForbidden {
    title: string;
    constructor(data: any) {
      this.title = data.title;
    }
  }

  class MockChannel {
    title: string;
    broadcast: boolean;
    username?: string;
    constructor(data: any) {
      this.title = data.title;
      this.broadcast = data.broadcast;
      this.username = data.username;
    }
  }

  class MockMessage {
    id: number;
    chatId: any;
    text: string;
    date: number;
    senderId?: any;
    sender?: any;
    constructor(data: any) {
      this.id = data.id;
      this.chatId = data.chatId;
      this.text = data.text;
      this.date = data.date;
      this.senderId = data.senderId;
      this.sender = data.sender;
    }
  }

  const MockApi = {
    User: MockUser,
    Chat: MockChat,
    ChatForbidden: MockChatForbidden,
    Channel: MockChannel,
    Message: MockMessage,
  };

  return {
    TelegramClient: jest.fn().mockImplementation(() => mockClient),
    Api: MockApi,
  };
});

jest.mock('telegram/sessions', () => ({
  StringSession: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('telegram/events', () => ({
  NewMessage: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('telegram/tl', () => {
  const mockModule = require('telegram');
  return {
    Api: mockModule.Api,
  };
});

jest.mock('readline', () => ({
  createInterface: jest.fn().mockReturnValue({
    question: jest.fn((_, callback) => callback('mock_input')),
    close: jest.fn(),
  }),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

jest.mock('path', () => ({
  dirname: jest.fn((p: string) => {
    const parts = p.split('/');
    parts.pop();
    return parts.join('/') || '/';
  }),
}));

describe('TelegramClient', () => {
  let config: TelegramClientConfig;
  let client: TelegramClient;

  beforeEach(() => {
    config = {
      apiId: 12345,
      apiHash: 'test_hash',
      sessionName: 'test_session',
    };
    client = new TelegramClient(config);
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      await client.connect();
      expect(client['isConnected']).toBe(true);
    });

    it('should not connect twice', async () => {
      await client.connect();
      const startMock = client['client'].start as jest.Mock;
      const firstCallCount = startMock.mock.calls.length;
      await client.connect();
      const secondCallCount = startMock.mock.calls.length;
      expect(firstCallCount).toBe(secondCallCount);
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      await client.connect();
      await client.disconnect();
      expect(client['isConnected']).toBe(false);
    });
  });

  describe('getSessionString', () => {
    it('should return session string', () => {
      const session = client.getSessionString();
      expect(session).toBe('mock_session_string');
    });
  });

  describe('getAllChats', () => {
    it('should throw error if not connected', async () => {
      await expect(client.getAllChats()).rejects.toThrow(
        'Client is not connected. Call connect() first.'
      );
    });

    it('should return all chats', async () => {
      const { Api } = require('telegram');
      
      const mockDialogs = [
        {
          id: '123',
          entity: new Api.User({
            firstName: 'John',
            lastName: 'Doe',
            username: 'johndoe',
          }),
        },
        {
          id: '456',
          entity: new Api.Chat({
            title: 'Test Group',
          }),
        },
        {
          id: '789',
          entity: new Api.Channel({
            title: 'Test Channel',
            broadcast: true,
            username: 'testchannel',
          }),
        },
      ];

      (client['client'].getDialogs as jest.Mock).mockResolvedValue(mockDialogs);
      await client.connect();

      const chats = await client.getAllChats();

      expect(chats).toHaveLength(3);
      expect(chats[0]).toEqual({
        id: '123',
        title: 'John Doe',
        type: 'private',
        username: 'johndoe',
      });
      expect(chats[1]).toEqual({
        id: '456',
        title: 'Test Group',
        type: 'group',
        username: undefined,
      });
      expect(chats[2]).toEqual({
        id: '789',
        title: 'Test Channel',
        type: 'channel',
        username: 'testchannel',
      });
    });
  });

  describe('Chat Listeners', () => {
    it('should add chat listener', () => {
      const handler: MessageHandler = jest.fn();
      client.addChatListener('123', handler);

      expect(client['listeners'].has('123')).toBe(true);
      expect(client['listeners'].get('123')?.has(handler)).toBe(true);
    });

    it('should add multiple listeners to same chat', () => {
      const handler1: MessageHandler = jest.fn();
      const handler2: MessageHandler = jest.fn();
      
      client.addChatListener('123', handler1);
      client.addChatListener('123', handler2);

      expect(client['listeners'].get('123')?.size).toBe(2);
    });

    it('should remove specific chat listener', () => {
      const handler1: MessageHandler = jest.fn();
      const handler2: MessageHandler = jest.fn();
      
      client.addChatListener('123', handler1);
      client.addChatListener('123', handler2);
      client.removeChatListener('123', handler1);

      expect(client['listeners'].get('123')?.has(handler1)).toBe(false);
      expect(client['listeners'].get('123')?.has(handler2)).toBe(true);
    });

    it('should remove all listeners for chat when no handler specified', () => {
      const handler1: MessageHandler = jest.fn();
      const handler2: MessageHandler = jest.fn();
      
      client.addChatListener('123', handler1);
      client.addChatListener('123', handler2);
      client.removeChatListener('123');

      expect(client['listeners'].has('123')).toBe(false);
    });

    it('should cleanup empty listener set', () => {
      const handler: MessageHandler = jest.fn();
      
      client.addChatListener('123', handler);
      client.removeChatListener('123', handler);

      expect(client['listeners'].has('123')).toBe(false);
    });
  });

  describe('Message handling', () => {
    it('should call handler when message received', async () => {
      const { Api } = require('telegram');
      const handler: MessageHandler = jest.fn();
      
      await client.connect();
      client.addChatListener('123', handler);

      // Get the event handler that was registered
      const addEventHandlerMock = client['client'].addEventHandler as jest.Mock;
      const eventHandlerCall = addEventHandlerMock.mock.calls[0];
      const eventHandler = eventHandlerCall[0];

      // Simulate incoming message
      const mockMessage = new Api.Message({
        id: 1,
        chatId: { toString: () => '123' },
        text: 'Hello',
        date: Math.floor(Date.now() / 1000),
        senderId: { toString: () => '456' },
        sender: new Api.User({
          firstName: 'Jane',
          lastName: 'Smith',
        }),
      });

      await eventHandler({ message: mockMessage });

      expect(handler).toHaveBeenCalledWith({
        id: 1,
        chatId: '123',
        text: 'Hello',
        date: expect.any(Date),
        senderId: '456',
        senderName: 'Jane Smith',
      });
    });

    it('should not call handler for different chat', async () => {
      const { Api } = require('telegram');
      const handler: MessageHandler = jest.fn();
      
      await client.connect();
      client.addChatListener('123', handler);

      const addEventHandlerMock = client['client'].addEventHandler as jest.Mock;
      const eventHandlerCall = addEventHandlerMock.mock.calls[0];
      const eventHandler = eventHandlerCall[0];

      const mockMessage = new Api.Message({
        id: 1,
        chatId: { toString: () => '999' },
        text: 'Hello',
        date: Math.floor(Date.now() / 1000),
      });

      await eventHandler({ message: mockMessage });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Session File Management', () => {
    let fs: any;

    beforeEach(() => {
      fs = require('fs');
      jest.clearAllMocks();
    });

    it('should read session from file on initialization', () => {
      const sessionContent = 'saved_session_string';
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(sessionContent);

      const configWithFile: TelegramClientConfig = {
        apiId: 12345,
        apiHash: 'test_hash',
        sessionFilePath: '/path/to/session.txt',
      };

      new TelegramClient(configWithFile);

      expect(fs.existsSync).toHaveBeenCalledWith('/path/to/session.txt');
      expect(fs.readFileSync).toHaveBeenCalledWith('/path/to/session.txt', 'utf-8');
    });

    it('should handle missing session file gracefully', () => {
      fs.existsSync.mockReturnValue(false);

      const configWithFile: TelegramClientConfig = {
        apiId: 12345,
        apiHash: 'test_hash',
        sessionFilePath: '/path/to/session.txt',
      };

      expect(() => new TelegramClient(configWithFile)).not.toThrow();
    });

    it('should save session to file after connection', async () => {
      fs.existsSync.mockReturnValue(false);

      const configWithFile: TelegramClientConfig = {
        apiId: 12345,
        apiHash: 'test_hash',
        sessionFilePath: '/path/to/session.txt',
      };

      const clientWithFile = new TelegramClient(configWithFile);
      await clientWithFile.connect();

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/path/to/session.txt',
        'mock_session_string',
        'utf-8'
      );
    });

    it('should create directory if it does not exist', async () => {
      fs.existsSync.mockReturnValue(false);

      const configWithFile: TelegramClientConfig = {
        apiId: 12345,
        apiHash: 'test_hash',
        sessionFilePath: '/path/to/session.txt',
      };

      const clientWithFile = new TelegramClient(configWithFile);
      await clientWithFile.connect();

      expect(fs.mkdirSync).toHaveBeenCalledWith('/path/to', { recursive: true });
    });

    it('should prefer sessionName over sessionFilePath', () => {
      const sessionContent = 'saved_session_string';
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(sessionContent);

      const configWithBoth: TelegramClientConfig = {
        apiId: 12345,
        apiHash: 'test_hash',
        sessionName: 'manual_session',
        sessionFilePath: '/path/to/session.txt',
      };

      new TelegramClient(configWithBoth);

      // Should not read from file if sessionName is provided
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });

    it('should handle file read errors gracefully', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const configWithFile: TelegramClientConfig = {
        apiId: 12345,
        apiHash: 'test_hash',
        sessionFilePath: '/path/to/session.txt',
      };

      expect(() => new TelegramClient(configWithFile)).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should handle file write errors gracefully', async () => {
      fs.existsSync.mockReturnValue(false);
      fs.writeFileSync.mockImplementation(() => {
        throw new Error('File write error');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const configWithFile: TelegramClientConfig = {
        apiId: 12345,
        apiHash: 'test_hash',
        sessionFilePath: '/path/to/session.txt',
      };

      const clientWithFile = new TelegramClient(configWithFile);
      await clientWithFile.connect();

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});

