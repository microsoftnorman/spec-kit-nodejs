# Documentation

This folder contains the documentation source files for Specify CLI (Node.js), built using [DocFX](https://dotnet.github.io/docfx/).

## About This Project

This is the Node.js/TypeScript implementation of GitHub Spec Kit. For the original Python version, see [github/spec-kit](https://github.com/github/spec-kit).

## Building Locally

To build the documentation locally:

1. Install DocFX:

   ```bash
   dotnet tool install -g docfx
   ```

2. Build the documentation:

   ```bash
   cd docs
   docfx docfx.json --serve
   ```

3. Open your browser to `http://localhost:8080` to view the documentation.

## Structure

- `docfx.json` - DocFX configuration file
- `index.md` - Main documentation homepage
- `toc.yml` - Table of contents configuration
- `installation.md` - Installation guide (Node.js/npm)
- `quickstart.md` - Quick start guide
- `local-development.md` - Local development guide (Node.js)
- `upgrade.md` - Upgrade guide (npm)
- `_site/` - Generated documentation output (ignored by git)

## Deployment

Documentation is automatically built and deployed to GitHub Pages when changes are pushed to the `main` branch. The workflow is defined in `.github/workflows/docs.yml`.
