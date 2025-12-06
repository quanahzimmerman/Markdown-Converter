import { jsPDF } from 'jspdf';
import FileSaver from 'file-saver';

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

  if (inQuote && quoteContent) {
    blocks.push({ type: 'quote', content: quoteContent.trim() });
  }

  return blocks;
}

// Clean markdown formatting
function cleanMarkdownText(text: string): string {
  // Convert wikilinks [[link]] to just "link"
  text = text.replace(/\[\[([^\]]+)\]\]/g, '$1');
  // Remove image links
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '[Image: $1]');
  // Remove regular links but keep text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Remove bold/italic markers for PDF (simpler rendering)
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '$1');
  text = text.replace(/\*\*(.+?)\*\*/g, '$1');
  text = text.replace(/\*(.+?)\*/g, '$1');
  text = text.replace(/`(.+?)`/g, '$1');
  text = text.replace(/~~(.+?)~~/g, '$1');
  return text;
}

export async function convertToPdf(markdown: string, filename: string): Promise<void> {
  const blocks = parseMarkdown(markdown);
  const doc = new jsPDF();

  // Page settings
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;
  let numberedIndex = 1;

  // Extract title
  const firstHeading = blocks.find(b => b.type === 'heading');
  const title = firstHeading?.content || filename;

  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(title, maxWidth);
  doc.text(titleLines, pageWidth / 2, y, { align: 'center' });
  y += titleLines.length * 10 + 15;

  // Process blocks
  for (const block of blocks) {
    // Check if we need a new page
    if (y > pageHeight - margin - 20) {
      doc.addPage();
      y = margin;
    }

    switch (block.type) {
      case 'heading':
        const sizes: Record<number, number> = { 1: 20, 2: 16, 3: 14, 4: 12, 5: 11, 6: 10 };
        doc.setFontSize(sizes[block.level || 1] || 12);
        doc.setFont('helvetica', 'bold');
        const headingLines = doc.splitTextToSize(block.content, maxWidth);
        doc.text(headingLines, margin, y);
        y += headingLines.length * (sizes[block.level || 1] / 2.5) + 8;
        break;

      case 'bullet':
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const bulletLines = doc.splitTextToSize(block.content, maxWidth - 10);
        doc.text('•', margin, y);
        doc.text(bulletLines, margin + 8, y);
        y += bulletLines.length * 5 + 4;
        break;

      case 'numbered':
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const numLines = doc.splitTextToSize(block.content, maxWidth - 15);
        doc.text(`${numberedIndex}.`, margin, y);
        doc.text(numLines, margin + 12, y);
        y += numLines.length * 5 + 4;
        numberedIndex++;
        break;

      case 'code':
        doc.setFontSize(9);
        doc.setFont('courier', 'normal');
        doc.setFillColor(245, 245, 245);
        const codeLines = doc.splitTextToSize(block.content, maxWidth - 10);
        const codeHeight = codeLines.length * 4 + 6;
        doc.rect(margin, y - 3, maxWidth, codeHeight, 'F');
        doc.text(codeLines, margin + 5, y + 2);
        y += codeHeight + 8;
        break;

      case 'quote':
        doc.setFontSize(11);
        doc.setFont('helvetica', 'italic');
        doc.setDrawColor(124, 92, 157);
        const quoteLines = doc.splitTextToSize(block.content, maxWidth - 15);
        doc.line(margin + 5, y - 2, margin + 5, y + quoteLines.length * 5 + 2);
        doc.text(quoteLines, margin + 12, y);
        y += quoteLines.length * 5 + 8;
        break;

      case 'paragraph':
      default:
        // Reset numbered list counter on paragraph
        numberedIndex = 1;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const paraLines = doc.splitTextToSize(block.content, maxWidth);
        doc.text(paraLines, margin, y);
        y += paraLines.length * 5 + 6;
        break;
    }
  }

  const outputFilename = `${filename}.pdf`;

  if (window.electronAPI?.isElectron) {
    const arrayBuffer = doc.output('arraybuffer');
    await window.electronAPI.saveFile({
      buffer: arrayBuffer,
      filename: outputFilename
    });
  } else {
    doc.save(outputFilename);
  }
}
