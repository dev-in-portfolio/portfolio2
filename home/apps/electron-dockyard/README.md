# Dockyard - Local Project Launchpad

Dockyard is an Electron-based desktop application for managing and launching local development projects. It provides a comprehensive workspace management system with repository organization, environment presets, diagnostic checks, and process orchestration.

## Features

### Core Project Management
- **Repository Management**: Add, organize, and configure multiple local repositories
- **Command Configuration**: Define dev, build, test, and lint commands per repository
- **Port Management**: Track and check port availability
- **Environment Presets**: Create reusable environment variable configurations

### Workspace System
- **Multi-Repo Workspaces**: Group related repositories into logical workspaces
- **Batch Operations**: Start/stop multiple repositories together
- **Workspace Switching**: Quickly switch between different project contexts

### Intelligent Diagnostics
- **Pre-Launch Checks**: Automatic validation before starting processes
- **Port Conflict Detection**: Prevent port collisions
- **Dependency Verification**: Check for node_modules availability
- **Command Validation**: Ensure commands are properly configured

### Process Orchestration
- **Process Lifecycle Management**: Start, stop, and monitor processes
- **Environment Variable Handling**: Merge presets, .env files, and overrides
- **Real-time Logging**: View process output in real-time
- **Status Monitoring**: Track running processes across repositories

### Configuration Management
- **Persistent Configuration**: Save all settings between sessions
- **Import/Export**: Backup and restore configurations
- **Cross-Platform**: Works on macOS, Windows, and Linux

## Architecture

- **Frontend**: Electron with custom HTML/CSS/JS interface
- **Backend**: Electron main process with IPC communication
- **Configuration**: JSON-based config stored in `~/.dockyard/config.json`
- **Process Management**: Node.js child_process for process orchestration

## Installation

### Pre-built Binaries
Download from releases:
- `Dockyard-macOS-x64.zip`
- `Dockyard-Windows-x64.zip`
- `Dockyard-Linux-x64.zip`

### Development Setup
```bash
# Clone repository
git clone https://github.com/dev-in-portfolio/portfolio2.git
cd portfolio2

# Install dependencies
npm install

# Start development mode
npm run electron-dev

# Build for production
npm run electron-build
```

## Usage

### Basic Workflow
1. **Add Repositories**: Click "Add Repo" and select your project directories
2. **Configure Commands**: Set dev, build, test, and lint commands for each repo
3. **Create Presets**: Define environment variable sets for different scenarios
4. **Create Workspaces**: Group related repositories for batch operations
5. **Run Diagnostics**: Check system readiness before launching
6. **Start Processes**: Launch dev servers with proper environment setup
7. **Monitor Output**: View logs and process status in real-time

### Advanced Features

#### Environment Management
```json
{
  "presets": [
    {
      "name": "local",
      "vars": {
        "NODE_ENV": "development",
        "DEBUG": "app:*"
      }
    },
    {
      "name": "production",
      "vars": {
        "NODE_ENV": "production",
        "API_URL": "https://api.example.com"
      }
    }
  ]
}
```

#### Workspace Configuration
```json
{
  "workspaces": [
    {
      "name": "Frontend Stack",
      "repoIds": ["repo1-id", "repo2-id", "repo3-id"]
    },
    {
      "name": "Backend Services",
      "repoIds": ["api-id", "auth-id", "db-id"]
    }
  ]
}
```

## Configuration File

The configuration is stored in `~/.dockyard/config.json`:

```json
{
  "repos": [
    {
      "id": "unique-id",
      "name": "my-project",
      "path": "/path/to/project",
      "commands": {
        "dev": "npm run dev",
        "build": "npm run build",
        "test": "npm test",
        "lint": "npm run lint"
      },
      "ports": [3000, 3001],
      "envPresetBindings": {
        "local": ".env",
        "production": ".env.production"
      }
    }
  ],
  "presets": [
    {
      "name": "local",
      "vars": {
        "NODE_ENV": "development"
      }
    }
  ],
  "workspaces": [
    {
      "name": "My Workspace",
      "repoIds": ["repo1-id", "repo2-id"]
    }
  ]
}
```

## Development

### Project Structure
```
electron-dockyard/
├── electron/          # Electron main process
│   ├── main.js        # Main process entry
│   └── preload.js     # Preload script for renderer
├── renderer/          # Renderer process
│   ├── index.html     # Main UI
│   ├── renderer.js    # UI logic
│   └── styles.css     # Styles
├── package.json       # Project configuration
└── README.md          # Documentation
```

### Key Files

#### `electron/main.js`
- Main Electron process
- IPC handlers for file dialogs, process management
- Configuration file I/O
- Process lifecycle management

#### `electron/preload.js`
- Bridge between main and renderer processes
- Exposes safe API to renderer

#### `renderer/renderer.js`
- UI state management
- Repository and workspace rendering
- Diagnostic checks
- Process control

#### `renderer/index.html`
- Multi-panel workbench interface
- Responsive grid layout
- Modal dialogs for configuration

## Building & Packaging

### Build Commands
```bash
# Install Electron builder
npm install electron-builder --save-dev

# Build for current platform
npm run electron-build

# Build for all platforms
npm run electron-build-all
```

### Packaging Configuration
Configure in `package.json`:
```json
"build": {
  "appId": "com.example.dockyard",
  "productName": "Dockyard",
  "files": ["electron/**/*", "renderer/**/*"],
  "mac": {
    "target": "dmg"
  },
  "win": {
    "target": "nsis"
  },
  "linux": {
    "target": "AppImage"
  }
}
```

## Troubleshooting

### Common Issues

**Port conflicts**: Check running processes with `lsof -i :3000` or `netstat -ano`

**Missing node_modules**: Run `npm install` in the repository directory

**Process won't start**: Check the logs panel for error messages

**Configuration issues**: Reset by deleting `~/.dockyard/config.json`

### Debugging

Enable debug logging by setting environment variable:
```bash
DEBUG=dockyard:* npm start
```

## Roadmap

### Planned Features
- **Process Groups**: Start/stop multiple processes with dependencies
- **Health Checks**: HTTP endpoint monitoring
- **Auto-Restart**: Automatic restart on file changes
- **Remote Repos**: Git integration and cloning
- **Plugin System**: Extensible architecture

### Technical Improvements
- **Performance**: Optimize large workspace handling
- **UI**: Dark/light theme support
- **Accessibility**: Keyboard navigation and screen reader support
- **Testing**: Comprehensive test suite

## Contributing

### Development Setup
```bash
git clone https://github.com/dev-in-portfolio/portfolio2.git
cd portfolio2
git checkout electron-dockyard
npm install
npm run electron-dev
```

### Pull Requests
- Follow existing code style
- Include tests for new features
- Update documentation
- Keep changes focused and atomic

## License

MIT License - See LICENSE file for details.

## Support

For issues and questions:
- GitHub Issues: https://github.com/dev-in-portfolio/portfolio2/issues
- Community Discussions: https://github.com/dev-in-portfolio/portfolio2/discussions

## Acknowledgements

Built with:
- Electron: Cross-platform desktop apps
- Node.js: JavaScript runtime
- Electron Builder: Packaging and distribution
