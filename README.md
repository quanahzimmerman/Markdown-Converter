# Markdown Converter

A simple macOS app to convert Markdown files to Word (.docx), PDF, and plain text formats.

## Features

- **Drag & drop** interface - just drop your `.md` file
- **Three output formats:**
  - Word document (.docx)
  - PDF (.pdf)
  - Plain text (.txt)
- **Handles Markdown formatting:**
  - Headings (H1-H6)
  - Bold, italic, strikethrough
  - Bullet and numbered lists
  - Code blocks
  - Blockquotes
- **Obsidian-friendly:** Converts `[[wikilinks]]` to plain text
- **Works offline** - no API keys or internet required

## Screenshot

![Markdown Converter](https://img.shields.io/badge/macOS-Electron-blue)

## Installation

### From Release (Recommended)

Download the latest `.dmg` from the [Releases](https://github.com/quanahzimmerman/Markdown-Converter/releases) page.

### Build from Source

```bash
# Clone the repo
git clone https://github.com/quanahzimmerman/Markdown-Converter.git
cd Markdown-Converter

# Install dependencies
npm install

# Run in development mode
npm run electron:dev

# Build the app
npm run electron:build
```

The built app will be in the `release/` folder.

## Tech Stack

- **Electron** - Desktop app framework
- **React** - UI
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **docx** - Word document generation
- **jsPDF** - PDF generation

## License

MIT
