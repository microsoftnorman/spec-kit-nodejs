# Installation Guide

## Prerequisites

- **Node.js 18+** ([Download](https://nodejs.org/))
- **Git** ([Download](https://git-scm.com/downloads))
- AI coding agent (optional, but recommended):
  - [Claude Code](https://www.anthropic.com/claude-code)
  - [GitHub Copilot](https://code.visualstudio.com/)
  - [Gemini CLI](https://github.com/google-gemini/gemini-cli)
  - [CodeBuddy CLI](https://www.codebuddy.ai/cli)
  - Or any other [supported agent](../AGENTS.md)

## Installation

### Install from npm (Recommended)

```bash
npm install -g @specify/cli
```

### Install from Source

```bash
git clone https://github.com/github/spec-kit-nodejs.git
cd spec-kit-nodejs
npm install
npm run build
npm link
```

## Quick Start

### Initialize a New Project

```bash
specify init <PROJECT_NAME>
```

Or initialize in the current directory:

```bash
specify init .
# or use the --here flag
specify init --here
```

### Specify AI Agent

You can specify your AI agent during initialization:

```bash
specify init <project_name> --ai claude
specify init <project_name> --ai gemini
specify init <project_name> --ai copilot
specify init <project_name> --ai codebuddy
```

### Specify Script Type (Shell vs PowerShell)

All automation scripts have both Bash (`.sh`) and PowerShell (`.ps1`) variants.

**Auto behavior:**

- Windows default: `ps` (PowerShell)
- macOS/Linux default: `sh` (Bash)
- Interactive mode: you'll be prompted unless you pass `--script`

**Force a specific script type:**

```bash
specify init <project_name> --script sh
specify init <project_name> --script ps
```

### Skip Agent Tool Check

If you prefer to get the templates without checking for the right tools:

```bash
specify init <project_name> --ai claude --ignore-agent-tools
```

## Available Commands

| Command | Description |
|---------|-------------|
| `specify init` | Initialize a new Specify project |
| `specify check` | Check that all required tools are installed |
| `specify version` | Display version and system information |
| `specify create-new-feature` | Create a new feature branch with spec files |
| `specify setup-plan` | Set up planning artifacts for a feature |
| `specify check-prerequisites` | Check prerequisites for a feature |
| `specify update-agent-context` | Update AI agent context files |

## Verification

After initialization, you should see the following commands available in your AI agent:

- `/speckit.specify` - Create specifications
- `/speckit.plan` - Generate implementation plans  
- `/speckit.tasks` - Break down into actionable tasks

The `.specify/scripts` directory will contain both `.sh` and `.ps1` scripts.

## Configuration

### GitHub Token (Optional)

For higher API rate limits (5,000 requests/hour vs 60/hour), set a GitHub token:

```bash
# Via environment variable
export GH_TOKEN=your_token_here
# or
export GITHUB_TOKEN=your_token_here

# Or via CLI flag
specify init my-project --github-token your_token_here
```

### Debug Mode

Enable verbose output for troubleshooting:

```bash
specify init my-project --debug
```

## Troubleshooting

### Node.js Version

Ensure you have Node.js 18 or higher:

```bash
node --version
# Should output v18.0.0 or higher
```

### Permission Errors (Unix/macOS)

If you encounter permission errors when installing globally:

```bash
# Option 1: Use sudo (not recommended)
sudo npm install -g @specify/cli

# Option 2: Fix npm permissions (recommended)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
npm install -g @specify/cli
```

### Git Credential Manager on Linux

If you're having issues with Git authentication on Linux:

```bash
#!/usr/bin/env bash
set -e
echo "Downloading Git Credential Manager v2.6.1..."
wget https://github.com/git-ecosystem/git-credential-manager/releases/download/v2.6.1/gcm-linux_amd64.2.6.1.deb
echo "Installing Git Credential Manager..."
sudo dpkg -i gcm-linux_amd64.2.6.1.deb
echo "Configuring Git to use GCM..."
git config --global credential.helper manager
echo "Cleaning up..."
rm gcm-linux_amd64.2.6.1.deb
```

### Rate Limiting

If you encounter GitHub API rate limiting:

1. Wait for the rate limit to reset (shown in error message)
2. Use a GitHub token for higher limits:
   ```bash
   export GH_TOKEN=your_token_here
   specify init my-project
   ```

### Network Issues

If you're behind a corporate proxy:

```bash
# Set proxy environment variables
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080
```

## Updating

### Update Global Installation

```bash
npm update -g @specify/cli
```

### Check Current Version

```bash
specify version
```
