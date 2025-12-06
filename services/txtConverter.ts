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

// Clean markdown to plain text
function markdownToPlainText(markdown: string): string {
  let text = markdown;

  // Remove YAML frontmatter
  text = text.replace(/^---[\s\S]*?---\n*/m, '');

  // Convert wikilinks [[link]] or [[link|display]] to just the text
  text = text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2');
  text = text.replace(/\[\[([^\]]+)\]\]/g, '$1');

  // Remove images but note them
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '[Image: $1]');

  // Convert links [text](url) to just text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove bold/italic formatting
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '$1');
  text = text.replace(/\*\*(.+?)\*\*/g, '$1');
  text = text.replace(/\*(.+?)\*/g, '$1');
  text = text.replace(/__(.+?)__/g, '$1');
  text = text.replace(/_(.+?)_/g, '$1');

  // Remove strikethrough
  text = text.replace(/~~(.+?)~~/g, '$1');

  // Remove inline code backticks
  text = text.replace(/`([^`]+)`/g, '$1');

  // Convert code blocks - remove the ``` markers but keep content
  text = text.replace(/```[\w]*\n([\s\S]*?)```/g, '\n$1\n');

  // Convert headers to plain text with underlines for h1 and h2
  text = text.replace(/^# (.+)$/gm, (_, title) => `${title}\n${'='.repeat(title.length)}`);
  text = text.replace(/^## (.+)$/gm, (_, title) => `${title}\n${'-'.repeat(title.length)}`);
  text = text.replace(/^#{3,6} (.+)$/gm, '$1');

  // Convert blockquotes - remove > but indent
  text = text.replace(/^>\s*(.+)$/gm, '    $1');

  // Keep bullet points but normalize them
  text = text.replace(/^[\*\-\+]\s+/gm, '  - ');

  // Keep numbered lists as is
  text = text.replace(/^(\d+)\.\s+/gm, '  $1. ');

  // Remove horizontal rules
  text = text.replace(/^[-*_]{3,}$/gm, '\n---\n');

  // Clean up multiple blank lines
  text = text.replace(/\n{3,}/g, '\n\n');

  // Trim
  text = text.trim();

  return text;
}

export async function convertToTxt(markdown: string, filename: string): Promise<void> {
  const plainText = markdownToPlainText(markdown);
  const outputFilename = `${filename}.txt`;

  if (window.electronAPI?.isElectron) {
    const encoder = new TextEncoder();
    const buffer = encoder.encode(plainText);
    await window.electronAPI.saveFile({
      buffer: buffer.buffer as ArrayBuffer,
      filename: outputFilename
    });
  } else {
    const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
    const saveAs = (FileSaver as any).saveAs || FileSaver;
    saveAs(blob, outputFilename);
  }
}
