# tg-lisa Demo Application

Demo application to test the tg-lisa package functionality.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure credentials:
```bash
cp .env.example .env
```

3. Edit `.env` file and add your Telegram API credentials from https://my.telegram.org

## Run

```bash
npm start
```

## Features

- Connects to Telegram
- Shows all available chats with their IDs (private, groups, channels)
- Allows selection of a chat by ID to monitor
- Listens to incoming messages in real-time
- Saves session for future use

## First Run

On first run, you'll need to:
1. Enter your phone number
2. Enter the code sent to Telegram
3. If you have 2FA enabled, enter your password

The app will automatically save your session to `telegram-session.txt`. On subsequent runs, it will use this file to skip authentication.

