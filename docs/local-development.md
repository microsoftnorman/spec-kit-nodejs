# Local Development Guide

This guide shows how to iterate on the `specify` CLI locally without publishing a release or committing to `main` first.

> Scripts have both Bash (`.sh`) and PowerShell (`.ps1`) variants. The CLI auto-selects based on OS unless you pass `--script sh|ps`.

## 1. Clone and Switch Branches

```bash
git clone https://github.com/github/spec-kit-nodejs.git
cd spec-kit-nodejs
# Work on a feature branch
git checkout -b your-feature-branch
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Build the Project

```bash
npm run build
```

## 4. Run the CLI Directly (Fastest Feedback)

You can execute the CLI via npm scripts without installing globally:

```bash
# Using npm run dev
npm run dev -- --help
npm run dev -- init demo-project --ai claude --ignore-agent-tools --script sh

# Or run the built CLI directly
node bin/specify.js --help
node bin/specify.js check
```

## 5. Link for Global Use (Isolated Testing)

Create a global symlink so you can run `specify` from anywhere:

```bash
# Link the package globally
npm link

# Now 'specify' is available everywhere
specify --help
specify check
specify init my-project --ai copilot --script sh --no-git
```

Re-running after code edits requires rebuilding (`npm run build`), but no re-linking.

To unlink:

```bash
npm unlink -g @specify/cli
```

## 6. Run via npx (Local Package)

Run directly from the project root without global install:

```bash
npx . --help
npx . check
npx . init demo-npx --ai copilot --ignore-agent-tools --script sh
```

## 7. Testing Script Permission Logic

After running an `init`, check that shell scripts are executable on POSIX systems:

```bash
ls -l .specify/scripts | grep .sh
# Expect owner execute bit (e.g. -rwxr-xr-x)
```

On Windows you will instead use the `.ps1` scripts (no chmod needed).

## 8. Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 9. Linting and Formatting

```bash
# Run ESLint
npm run lint

# Run Prettier
npm run format

# Type-check without emitting
npm run typecheck
```

## 10. Using a Temporary Workspace

When testing `init --here` in a dirty directory, create a temp workspace:

```bash
# Create temp directory
mkdir /tmp/spec-test && cd /tmp/spec-test

# Run from the project (use absolute path or npx from source)
npx /path/to/spec-kit-nodejs init --here --ai claude --ignore-agent-tools --script sh
```

## 11. Debug Network / TLS Skips

If you need to bypass TLS validation while experimenting:

```bash
specify check --skip-tls
specify init demo --skip-tls --ai gemini --ignore-agent-tools --script ps
```

(Use only for local experimentation.)

## 12. Rapid Edit Loop Summary

| Action | Command |
|--------|---------|
| Install dependencies | `npm install` |
| Build project | `npm run build` |
| Run CLI directly | `npm run dev -- --help` |
| Run built CLI | `node bin/specify.js ...` |
| Link globally | `npm link` then `specify ...` |
| Run via npx | `npx . ...` |
| Run tests | `npm test` |
| Watch tests | `npm run test:watch` |

## 13. Cleaning Up

Remove build artifacts:

```bash
# Remove build output
rm -rf dist

# Remove node_modules (full clean)
rm -rf node_modules

# Reinstall
npm install
```

## 14. Common Issues

| Symptom | Fix |
|---------|-----|
| `Cannot find module` | Run `npm run build` after code changes |
| Scripts not executable (Linux) | Re-run init or `chmod +x .specify/scripts/*.sh` |
| Git step skipped | You passed `--no-git` or Git not installed |
| Wrong script type downloaded | Pass `--script sh` or `--script ps` explicitly |
| TLS errors on corporate network | Try `--skip-tls` (not for production) |
| TypeScript errors | Run `npm run typecheck` to see all errors |

## 15. Next Steps

- Update docs and run through Quick Start using your modified CLI
- Open a PR when satisfied
- Tag a release once changes land in `main`
