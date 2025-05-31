# Agent Development Kit Web Interface

A modern web interface for the Agent Development Kit, built with Next.js and Shadcn UI.

## Features

- Real-time WebSocket communication
- Session management
- State visualization
- Event monitoring
- Performance evaluation
- Artifact management

## Getting Started

### Prerequisites

- Node.js 18.0.0 or later
- npm 9.0.0 or later

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd adk-web-next
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
adk-web-next/
├── src/
│   ├── app/                 # Next.js app directory
│   ├── components/          # React components
│   │   ├── session-tab/     # Session management
│   │   ├── state-tab/       # State visualization
│   │   ├── event-tab/       # Event monitoring
│   │   ├── eval-tab/        # Performance evaluation
│   │   └── artifact-tab/    # Artifact management
│   ├── store/              # State management
│   └── lib/                # Utility functions
├── public/                 # Static assets
└── package.json           # Project dependencies
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### WebSocket Integration

The application uses WebSocket for real-time communication with the backend. The WebSocket connection is managed through the Zustand store in `src/store/websocket-store.ts`.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
