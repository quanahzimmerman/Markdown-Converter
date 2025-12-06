import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import FileSaver from "file-saver";

// Declare the Electron API
declare global {
  interface Window {
    electronAPI?: {
      saveFile: (data: { buffer: ArrayBuffer; filename: string }) => Promise<{ success: boolean; filePath?: string }>;
      isElectron: boolean;
    };
  }
}

interface ParsedBlock {
  type: 'heading' | 'paragraph' | 'bullet' | 'numbered' | 'code' | 'quote';
  level?: number;
  content: string;
}

// Parse markdown into blocks
function parseMarkdown(markdown: string): ParsedBlock[] {
  const lines = markdown.split('\n');
  const blocks: ParsedBlock[] = [];
  let inCodeBlock = false;
  let codeContent = '';
  let inQuote = false;
  let quoteContent = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        blocks.push({ type: 'code', content: codeContent.trim() });
        codeContent = '';
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent += line + '\n';
      continue;
    }

    // Skip YAML frontmatter
    if (line === '---' && i === 0) {
      while (i < lines.length - 1 && lines[++i] !== '---') {}
      continue;
    }

    // Empty lines
    if (line.trim() === '') {
      if (inQuote && quoteContent) {
        blocks.push({ type: 'quote', content: quoteContent.trim() });
        quoteContent = '';
        inQuote = false;
      }
      continue;
    }

    // Blockquotes
    if (line.startsWith('>')) {
      inQuote = true;
      quoteContent += line.replace(/^>\s*/, '') + ' ';
      continue;
    } else if (inQuote && quoteContent) {
      blocks.push({ type: 'quote', content: quoteContent.trim() });
      quoteContent = '';
      inQuote = false;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        content: cleanMarkdownText(headingMatch[2])
      });
      continue;
    }

    // Bullet lists
    if (line.match(/^[\*\-\+]\s+/)) {
      blocks.push({
        type: 'bullet',
        content: cleanMarkdownText(line.replace(/^[\*\-\+]\s+/, ''))
      });
      continue;
    }

    // Numbered lists
    const numberedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (numberedMatch) {
      blocks.push({
        type: 'numbered',
        content: cleanMarkdownText(numberedMatch[1])
      });
      continue;
    }

    // Regular paragraph
    blocks.push({
      type: 'paragraph',
      content: cleanMarkdownText(line)
    });
  }

  // Handle remaining quote
  if (inQuote && quoteContent) {
    blocks.push({ type: 'quote', content: quoteContent.trim() });
  }

  return blocks;
}

// Clean markdown formatting and convert to plain text with style markers
function cleanMarkdownText(text: string): string {
  // Convert wikilinks [[link]] to just "link"
  text = text.replace(/\[\[([^\]]+)\]\]/g, '$1');
  // Remove image links
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '[Image: $1]');
  // Remove regular links but keep text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  return text;
}

// Parse inline styles and create TextRuns
function createTextRuns(text: string): TextRun[] {
  const runs: TextRun[] = [];

  // Simple regex-based parsing for bold, italic, code
  const pattern = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|~~(.+?)~~|([^*`~]+))/g;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match[2]) {
      // Bold + Italic ***text***
      runs.push(new TextRun({ text: match[2], bold: true, italics: true }));
    } else if (match[3]) {
      // Bold **text**
      runs.push(new TextRun({ text: match[3], bold: true }));
    } else if (match[4]) {
      // Italic *text*
      runs.push(new TextRun({ text: match[4], italics: true }));
    } else if (match[5]) {
      // Code `text`
      runs.push(new TextRun({ text: match[5], font: "Courier New", size: 20, color: "D14D41" }));
    } else if (match[6]) {
      // Strikethrough ~~text~~
      runs.push(new TextRun({ text: match[6], strike: true }));
    } else if (match[7]) {
      // Plain text
      runs.push(new TextRun({ text: match[7] }));
    }
  }

  if (runs.length === 0) {
    runs.push(new TextRun({ text }));
  }

  return runs;
}

// Convert parsed blocks to docx paragraphs
function blockToParagraph(block: ParsedBlock): Paragraph {
  switch (block.type) {
    case 'heading':
      let headingLevel = HeadingLevel.HEADING_1;
      if (block.level === 2) headingLevel = HeadingLevel.HEADING_2;
      if (block.level === 3) headingLevel = HeadingLevel.HEADING_3;
      if (block.level === 4) headingLevel = HeadingLevel.HEADING_4;
      if (block.level === 5) headingLevel = HeadingLevel.HEADING_5;
      if (block.level === 6) headingLevel = HeadingLevel.HEADING_6;

      return new Paragraph({
        children: createTextRuns(block.content),
        heading: headingLevel,
        spacing: { before: 400, after: 200 },
      });

    case 'bullet':
      return new Paragraph({
        children: createTextRuns(block.content),
        bullet: { level: 0 },
        spacing: { before: 100, after: 100 },
      });

    case 'numbered':
      return new Paragraph({
        children: createTextRuns(block.content),
        numbering: { reference: "standard-numbering", level: 0 },
        spacing: { before: 100, after: 100 },
      });

    case 'code':
      return new Paragraph({
        children: [new TextRun({ text: block.content, font: "Courier New", size: 20 })],
        spacing: { before: 200, after: 200 },
        shading: { fill: "F5F5F5" },
        border: {
          left: { color: "E0E0E0", space: 10, style: "single", size: 6 }
        }
      });

    case 'quote':
      return new Paragraph({
        children: createTextRuns(block.content),
        indent: { left: 720 },
        spacing: { before: 200, after: 200 },
        border: {
          left: { color: "7c5c9d", space: 10, style: "single", size: 12 }
        }
      });

    case 'paragraph':
    default:
      return new Paragraph({
        children: createTextRuns(block.content),
        spacing: { before: 200, after: 200 },
        alignment: AlignmentType.LEFT,
      });
  }
}

export async function convertToDocx(markdown: string, filename: string): Promise<void> {
  const blocks = parseMarkdown(markdown);

  // Extract title from first heading or use filename
  const firstHeading = blocks.find(b => b.type === 'heading');
  const title = firstHeading?.content || filename;

  const doc = new Document({
    creator: "Markdown Converter",
    title: title,
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.TITLE,
            spacing: { after: 400 },
            alignment: AlignmentType.CENTER
          }),
          ...blocks.map(blockToParagraph)
        ],
      },
    ],
  });

  const outputFilename = `${filename}.docx`;

  // Always use toBlob() which works in browser environments
  const blob = await Packer.toBlob(doc);

  if (window.electronAPI?.isElectron) {
    // Convert blob to ArrayBuffer for Electron
    const arrayBuffer = await blob.arrayBuffer();
    await window.electronAPI.saveFile({
      buffer: arrayBuffer,
      filename: outputFilename
    });
  } else {
    const saveAs = (FileSaver as any).saveAs || FileSaver;
    saveAs(blob, outputFilename);
  }
}
