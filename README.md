# Telegram Domino Mini App

A Telegram Mini App for playing Domino in group chats. Built with TypeScript, Express, and the Telegram Web App API.

## Features

- Join game functionality for group chat members
- Real-time player count updates
- Maximum 4 players per game
- Chat-specific game instances
- Modern UI with Telegram theme integration

## Development

### Prerequisites

- Node.js 20 or higher
- npm
- Telegram Bot Token (from @BotFather)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/TelegramDominotMiniApp.git
cd TelegramDominotMiniApp
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```
Edit `.env` and add your Telegram Bot Token.

4. Start development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

### Building

To build the application:

```bash
npm run build
```

This will:
1. Build the server TypeScript files
2. Build the client TypeScript files
3. Prepare static files for deployment

## Bot Setup

1. Create a new bot with [@BotFather](https://t.me/botfather):
   - Use `/newbot` command
   - Follow the instructions to create your bot
   - Save the bot token

2. Configure the Web App:
   - Use `/newapp` command with your bot
   - Set the app URL to your GitHub Pages URL
   - Save the Web App URL

3. Start the bot in development mode:
```bash
npm run bot:dev
```

4. Build and start the bot in production:
```bash
npm run bot:build
npm run bot:start
```

## Deployment

The app is automatically deployed to GitHub Pages when changes are pushed to the main branch.

### Manual Deployment

1. Build the application:
```bash
npm run build
```

2. The static files will be available in the `public` directory.

## Setting up in Telegram

1. Talk to [@BotFather](https://t.me/botfather) in Telegram
2. Create a new bot or select an existing one
3. Use the `/newapp` command
4. Set the app URL to your GitHub Pages URL (e.g., `https://yourusername.github.io/TelegramDominotMiniApp`)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 