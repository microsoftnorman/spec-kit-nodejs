# AGENTS.md

## About Spec Kit and Specify

**GitHub Spec Kit** is a comprehensive toolkit for implementing Spec-Driven Development (SDD) - a methodology that emphasizes creating clear specifications before implementation. The toolkit includes templates, scripts, and workflows that guide development teams through a structured approach to building software.

**Specify CLI** is the command-line interface that bootstraps projects with the Spec Kit framework. It sets up the necessary directory structures, templates, and AI agent integrations to support the Spec-Driven Development workflow.

This is the **Node.js/TypeScript implementation**. For the original Python version, see [github/spec-kit](https://github.com/github/spec-kit).

The toolkit supports multiple AI coding assistants, allowing teams to use their preferred tools while maintaining consistent project structure and development practices.

---

## General Practices

- Any changes to the CLI require a version bump in `package.json` and addition of entries to `CHANGELOG.md`.
- Run tests before committing: `npm test`
- Run linting before committing: `npm run lint`

## Adding New Agent Support

This section explains how to add support for new AI agents/assistants to the Specify CLI. Use this guide as a reference when integrating new AI tools into the Spec-Driven Development workflow.

### Overview

Specify supports multiple AI agents by generating agent-specific command files and directory structures when initializing projects. Each agent has its own conventions for:

- **Command file formats** (Markdown, TOML, etc.)
- **Directory structures** (`.claude/commands/`, `.windsurf/workflows/`, etc.)
- **Command invocation patterns** (slash commands, CLI tools, etc.)
- **Argument passing conventions** (`$ARGUMENTS`, `{{args}}`, etc.)

### Current Supported Agents

| Agent | Directory | Format | CLI Tool | Description |
|-------|-----------|---------|----------|-------------|
| **Claude Code** | `.claude/commands/` | Markdown | `claude` | Anthropic's Claude Code CLI |
| **Gemini CLI** | `.gemini/commands/` | TOML | `gemini` | Google's Gemini CLI |
| **GitHub Copilot** | `.github/agents/` | Markdown | N/A (IDE-based) | GitHub Copilot in VS Code |
| **Cursor** | `.cursor/commands/` | Markdown | N/A (IDE-based) | Cursor IDE |
| **Qwen Code** | `.qwen/commands/` | TOML | `qwen` | Alibaba's Qwen Code CLI |
| **opencode** | `.opencode/command/` | Markdown | `opencode` | opencode CLI |
| **Codex CLI** | `.codex/commands/` | Markdown | `codex` | Codex CLI |
| **Windsurf** | `.windsurf/workflows/` | Markdown | N/A (IDE-based) | Windsurf IDE workflows |
| **Kilo Code** | `.kilocode/rules/` | Markdown | N/A (IDE-based) | Kilo Code IDE |
| **Auggie CLI** | `.augment/rules/` | Markdown | `auggie` | Auggie CLI |
| **Roo Code** | `.roo/rules/` | Markdown | N/A (IDE-based) | Roo Code IDE |
| **CodeBuddy CLI** | `.codebuddy/commands/` | Markdown | `codebuddy` | CodeBuddy CLI |
| **Amazon Q Developer CLI** | `.amazonq/prompts/` | Markdown | `q` | Amazon Q Developer CLI |
| **Amp** | `.agents/commands/` | Markdown | `amp` | Amp CLI |
| **SHAI** | `.shai/commands/` | Markdown | `shai` | SHAI CLI |

### Step-by-Step Integration Guide

Follow these steps to add a new agent (using a hypothetical new agent as an example):

#### 1. Add to AGENT_CONFIG

**IMPORTANT**: Use the actual CLI tool name as the key, not a shortened version.

Add the new agent to the `AGENT_CONFIG` object in `src/lib/config.ts`. This is the **single source of truth** for all agent metadata:

```typescript
export const AGENT_CONFIG: Record<string, AgentConfig> = {
  // ... existing agents ...
  'new-agent-cli': {  // Use the ACTUAL CLI tool name (what users type in terminal)
    name: 'New Agent Display Name',
    folder: '.newagent/',  // Directory for agent files
    installUrl: 'https://example.com/install',  // URL for installation docs (or null if IDE-based)
    requiresCli: true,  // true if CLI tool required, false for IDE-based agents
  },
};
```

**Key Design Principle**: The dictionary key should match the actual executable name that users install. For example:

- ✅ Use `"cursor-agent"` because the CLI tool is literally called `cursor-agent`
- ❌ Don't use `"cursor"` as a shortcut if the tool is `cursor-agent`

This eliminates the need for special-case mappings throughout the codebase.

**Field Explanations**:

- `name`: Human-readable display name shown to users
- `folder`: Directory where agent-specific files are stored (relative to project root)
- `installUrl`: Installation documentation URL (set to `null` for IDE-based agents)
- `requiresCli`: Whether the agent requires a CLI tool check during initialization

#### 2. Update Agent Lists

Update the `ALL_AGENT_KEYS`, `IDE_AGENTS`, and `CLI_AGENTS` arrays in `src/lib/config.ts`:

```typescript
export const ALL_AGENT_KEYS = [
  // ... existing agents ...
  'new-agent-cli',
] as const;

// Add to IDE_AGENTS if IDE-based, or CLI_AGENTS if CLI-based
export const CLI_AGENTS = [
  // ... existing agents ...
  'new-agent-cli',
] as const;
```

#### 3. Update README Documentation

Update the **Supported AI Agents** section in `README.md` to include the new agent:

- Add the new agent to the table with appropriate support level (Full/Partial)
- Include the agent's official website link
- Add any relevant notes about the agent's implementation
- Ensure the table formatting remains aligned and consistent

#### 4. Update Release Package Script

Modify `.github/workflows/scripts/create-release-packages.sh`:

##### Add to ALL_AGENTS array

```bash
ALL_AGENTS=(claude gemini copilot cursor-agent qwen opencode windsurf codex kilocode auggie roo codebuddy amp shai q)
```

##### Add case statement for directory structure

```bash
case $agent in
  # ... existing cases ...
  new-agent-cli)
    mkdir -p "$base_dir/.newagent/commands"
    generate_commands new-agent-cli md "\$ARGUMENTS" "$base_dir/.newagent/commands" "$script" ;;
esac
```

#### 5. Update GitHub Release Script

Modify `.github/workflows/scripts/create-github-release.sh` to include the new agent's packages:

```bash
gh release create "$VERSION" \
  # ... existing packages ...
  .genreleases/spec-kit-template-new-agent-cli-sh-"$VERSION".zip \
  .genreleases/spec-kit-template-new-agent-cli-ps-"$VERSION".zip \
  # Add new agent packages here
```

#### 6. Update Agent Context Scripts

##### Bash script (`scripts/bash/update-agent-context.sh`)

Add file variable:

```bash
NEWAGENT_FILE="$REPO_ROOT/.newagent/rules/specify-rules.md"
```

Add to case statement:

```bash
case "$AGENT_TYPE" in
  # ... existing cases ...
  new-agent-cli) update_agent_file "$NEWAGENT_FILE" "New Agent" ;;
esac
```

##### PowerShell script (`scripts/powershell/update-agent-context.ps1`)

Add file variable:

```powershell
$newagentFile = Join-Path $repoRoot '.newagent/rules/specify-rules.md'
```

Add to switch statement:

```powershell
switch ($AgentType) {
    # ... existing cases ...
    'new-agent-cli' { Update-AgentFile $newagentFile 'New Agent' }
}
```

**Note**: CLI tool checks are handled automatically based on the `requiresCli` field in AGENT_CONFIG. No additional code changes needed in the `check` or `init` commands - they automatically loop through AGENT_CONFIG and check tools as needed.

## Important Design Decisions

### Using Actual CLI Tool Names as Keys

**CRITICAL**: When adding a new agent to AGENT_CONFIG, always use the **actual executable name** as the dictionary key, not a shortened or convenient version.

**Why this matters:**

- The `checkTool()` function uses `which` (Unix) or `where` (Windows) to find executables in the system PATH
- If the key doesn't match the actual CLI tool name, you'll need special-case mappings throughout the codebase
- This creates unnecessary complexity and maintenance burden

**Example - The Cursor Lesson:**

❌ **Wrong approach** (requires special-case mapping):

```typescript
export const AGENT_CONFIG = {
  cursor: {  // Shorthand that doesn't match the actual tool
    name: 'Cursor',
    // ...
  },
};

// Then you need special cases everywhere:
let cliTool = agentKey;
if (agentKey === 'cursor') {
  cliTool = 'cursor-agent';  // Map to the real tool name
}
```

✅ **Correct approach** (no mapping needed):

```typescript
export const AGENT_CONFIG = {
  'cursor-agent': {  // Matches the actual executable name
    name: 'Cursor',
    // ...
  },
};

// No special cases needed - just use agentKey directly!
```

**Benefits of this approach:**

- Eliminates special-case logic scattered throughout the codebase
- Makes the code more maintainable and easier to understand
- Reduces the chance of bugs when adding new agents
- Tool checking "just works" without additional mappings

#### 7. Update Devcontainer files (Optional)

For agents that have VS Code extensions or require CLI installation, update the devcontainer configuration files:

##### VS Code Extension-based Agents

For agents available as VS Code extensions, add them to `.devcontainer/devcontainer.json`:

```json
{
  "customizations": {
    "vscode": {
      "extensions": [
        // ... existing extensions ...
        // [New Agent Name]
        "[New Agent Extension ID]"
      ]
    }
  }
}
```

##### CLI-based Agents

For agents that require CLI tools, add installation commands to `.devcontainer/post-create.sh`:

```bash
#!/bin/bash

# Existing installations...

echo -e "\n🤖 Installing [New Agent Name] CLI..."
# npm install -g [agent-cli-package]@latest  # Example for npm-based CLI
echo "✅ Done"
```

**Quick Tips:**

- **Extension-based agents**: Add to the `extensions` array in `devcontainer.json`
- **CLI-based agents**: Add installation scripts to `post-create.sh`
- **Hybrid agents**: May require both extension and CLI installation
- **Test thoroughly**: Ensure installations work in the devcontainer environment

## Agent Categories

### CLI-Based Agents

Require a command-line tool to be installed:

- **Claude Code**: `claude` CLI
- **Gemini CLI**: `gemini` CLI
- **Qwen Code**: `qwen` CLI
- **opencode**: `opencode` CLI
- **Codex CLI**: `codex` CLI
- **Auggie CLI**: `auggie` CLI
- **CodeBuddy CLI**: `codebuddy` CLI
- **Amazon Q Developer CLI**: `q` CLI
- **Amp**: `amp` CLI
- **SHAI**: `shai` CLI

### IDE-Based Agents

Work within integrated development environments:

- **GitHub Copilot**: Built into VS Code/compatible editors
- **Cursor**: Built into Cursor IDE
- **Windsurf**: Built into Windsurf IDE
- **Kilo Code**: Built into Kilo Code IDE
- **Roo Code**: Built into Roo Code IDE

## Command File Formats

### Markdown Format

Used by: Claude, Cursor, opencode, Windsurf, Amazon Q Developer, Amp, SHAI

**Standard format:**

```markdown
---
description: "Command description"
---

Command content with {SCRIPT} and $ARGUMENTS placeholders.
```

**GitHub Copilot Chat Mode format:**

```markdown
---
description: "Command description"
mode: speckit.command-name
---

Command content with {SCRIPT} and $ARGUMENTS placeholders.
```

### TOML Format

Used by: Gemini, Qwen

```toml
description = "Command description"

prompt = """
Command content with {SCRIPT} and {{args}} placeholders.
"""
```

## Directory Conventions

- **CLI agents**: Usually `.<agent-name>/commands/`
- **IDE agents**: Follow IDE-specific patterns:
  - Copilot: `.github/agents/`
  - Cursor: `.cursor/commands/`
  - Windsurf: `.windsurf/workflows/`

## Argument Patterns

Different agents use different argument placeholders:

- **Markdown/prompt-based**: `$ARGUMENTS`
- **TOML-based**: `{{args}}`
- **Script placeholders**: `{SCRIPT}` (replaced with actual script path)
- **Agent placeholders**: `__AGENT__` (replaced with agent name)

## Testing New Agent Integration

1. **Build test**: `npm run build` - ensure TypeScript compiles
2. **Unit tests**: `npm test` - all tests should pass
3. **CLI test**: `npm run dev -- init my-project --ai <agent>` - test initialization
4. **File generation**: Verify correct directory structure and files
5. **Command validation**: Ensure generated commands work with the agent
6. **Context update**: Test agent context update scripts

## Common Pitfalls

1. **Using shorthand keys instead of actual CLI tool names**: Always use the actual executable name as the AGENT_CONFIG key (e.g., `"cursor-agent"` not `"cursor"`). This prevents the need for special-case mappings throughout the codebase.
2. **Forgetting to update agent lists**: Update `ALL_AGENT_KEYS`, `IDE_AGENTS`, or `CLI_AGENTS` in `src/lib/config.ts`.
3. **Forgetting update scripts**: Both bash and PowerShell scripts must be updated when adding new agents.
4. **Incorrect `requiresCli` value**: Set to `true` only for agents that actually have CLI tools to check; set to `false` for IDE-based agents.
5. **Wrong argument format**: Use correct placeholder format for each agent type (`$ARGUMENTS` for Markdown, `{{args}}` for TOML).
6. **Directory naming**: Follow agent-specific conventions exactly (check existing agents for patterns).
7. **Help text inconsistency**: Update all user-facing text consistently (help strings, README, error messages).

## Future Considerations

When adding new agents:

- Consider the agent's native command/workflow patterns
- Ensure compatibility with the Spec-Driven Development process
- Document any special requirements or limitations
- Update this guide with lessons learned
- Verify the actual CLI tool name before adding to AGENT_CONFIG

---

*This documentation should be updated whenever new agents are added to maintain accuracy and completeness.*
