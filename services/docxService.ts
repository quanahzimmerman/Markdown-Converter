import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import FileSaver from "file-saver";
import { ConvertedDocument, DocBlock, TextRunStyle } from "../types";

// Declare the Electron API that's exposed via preload
declare global {
  interface Window {
    electronAPI?: {
      saveFile: (data: { buffer: ArrayBuffer; filename: string }) => Promise<{ success: boolean; filePath?: string }>;
      isElectron: boolean;
    };
  }
}

const mapTextRuns = (runs: TextRunStyle[]): TextRun[] => {
  return runs.map((run) => {
    return new TextRun({
      text: run.text,
      bold: run.bold,
      italics: run.italic,
      strike: run.strike,
      font: "Calibri", // Professional font
      size: run.code ? 20 : 24, // 10pt for code, 12pt for normal (docx uses half-points)
      color: run.code ? "D14D41" : "000000",
      highlight: run.code ? "f3f4f6" : undefined, // Light gray for code
    });
  });
};

const mapBlockToParagraph = (block: DocBlock): Paragraph => {
  const commonSpacing = { before: 200, after: 200 };

  switch (block.type) {
    case 'heading':
      let headingLevel = HeadingLevel.HEADING_1;
      if (block.level === 2) headingLevel = HeadingLevel.HEADING_2;
      if (block.level === 3) headingLevel = HeadingLevel.HEADING_3;
      if (block.level === 4) headingLevel = HeadingLevel.HEADING_4;

      return new Paragraph({
        children: mapTextRuns(block.content),
        heading: headingLevel,
        spacing: { before: 400, after: 200 },
      });

    case 'bullet_list':
      return new Paragraph({
        children: mapTextRuns(block.content),
        bullet: {
          level: (block.level || 1) - 1,
        },
        spacing: { before: 100, after: 100 },
      });

    case 'numbered_list':
      return new Paragraph({
        children: mapTextRuns(block.content),
        numbering: {
          reference: "standard-numbering",
          level: (block.level || 1) - 1,
        },
        spacing: { before: 100, after: 100 },
      });

    case 'code_block':
      return new Paragraph({
        children: mapTextRuns(block.content.map(c => ({...c, code: true}))),
        spacing: { before: 200, after: 200 },
        shading: {
          fill: "F5F5F5",
        },
        border: {
          left: {
            color: "E0E0E0",
            space: 10,
            style: "single",
            size: 6,
          }
        }
      });

    case 'quote':
        return new Paragraph({
            children: mapTextRuns(block.content.map(c => ({...c, italic: true}))),
            indent: { left: 720 }, // 0.5 inch
            spacing: commonSpacing,
            border: {
                left: {
                    color: "7c5c9d", // Obsidian purple ish
                    space: 10,
                    style: "single",
                    size: 12,
                }
            }
        });

    case 'paragraph':
    default:
      return new Paragraph({
        children: mapTextRuns(block.content),
        spacing: commonSpacing,
        alignment: AlignmentType.LEFT,
      });
  }
};

export const generateAndDownloadDocx = async (data: ConvertedDocument) => {
  const doc = new Document({
    creator: "Obsidian to Docx AI Converter",
    title: data.title,
    description: "Converted from Markdown using Gemini AI",
    sections: [
      {
        properties: {},
        children: [
            // Title of the doc as a major title at top
            new Paragraph({
                text: data.title,
                heading: HeadingLevel.TITLE,
                spacing: { after: 400 },
                alignment: AlignmentType.CENTER
            }),
            ...data.blocks.map(mapBlockToParagraph)
        ],
      },
    ],
  });

  const filename = `${data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`;

  // Check if running in Electron and use native save dialog
  if (window.electronAPI?.isElectron) {
    const buffer = await Packer.toBuffer(doc);
    const result = await window.electronAPI.saveFile({
      buffer: buffer.buffer as ArrayBuffer,
      filename
    });
    if (!result.success) {
      console.log('Save cancelled by user');
    }
  } else {
    // Fallback to browser-based file-saver
    const blob = await Packer.toBlob(doc);
    // Handle file-saver import which can vary between environments (default function vs object)
    const saveAs = (FileSaver as any).saveAs || FileSaver;
    saveAs(blob, filename);
  }
};
