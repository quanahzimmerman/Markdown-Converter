import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ConvertedDocument } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Define the response schema for Gemini
const textRunSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    text: { type: Type.STRING, description: "The content of the text segment." },
    bold: { type: Type.BOOLEAN, description: "Whether the text is bold." },
    italic: { type: Type.BOOLEAN, description: "Whether the text is italic." },
    code: { type: Type.BOOLEAN, description: "Whether the text is inline code." },
    strike: { type: Type.BOOLEAN, description: "Whether the text is strikethrough." },
  },
  required: ["text"],
};

const blockSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    type: { 
      type: Type.STRING, 
      enum: ["paragraph", "heading", "bullet_list", "numbered_list", "code_block", "quote"],
      description: "The type of the block." 
    },
    level: { type: Type.INTEGER, description: "Heading level (1-6) or List nesting level." },
    content: {
      type: Type.ARRAY,
      items: textRunSchema,
      description: "The text content of the block broken down by style.",
    },
  },
  required: ["type", "content"],
};

const docSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "The title of the document inferred from filename or content." },
    blocks: {
      type: Type.ARRAY,
      items: blockSchema,
      description: "The structured blocks of the document.",
    },
  },
  required: ["title", "blocks"],
};

export const parseMarkdownWithGemini = async (markdown: string, filename: string): Promise<ConvertedDocument> => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please set the API_KEY environment variable.");
  }

  const modelId = "gemini-2.5-flash"; // Excellent for large context and structured output

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are an expert document formatter. Your task is to convert the following Obsidian Markdown file content into a structured JSON format suitable for generating a professional Word document.

Input Filename: ${filename}

Instructions:
1. **Clean & Polish**: Fix minor grammar mistakes, spacing issues, and standardize formatting.
2. **Obsidian Specifics**:
   - Convert Wikilinks like [[Page Name]] to simple text "Page Name" (bold it if it seems important).
   - Remove YAML frontmatter (between --- and ---) but extract the 'title' from it if present.
   - If no title in frontmatter, use the first H1 or the filename.
3. **Structure**: Break the document into blocks (headings, paragraphs, lists).
4. **Styling**: Break down paragraph content into text runs to preserve bold (**text**), italic (*text*), and code (\`text\`) formatting.
5. **Images**: Replace image links ![[image.png]] with a placeholder paragraph "[Image: image.png removed]" as we cannot embed local images.
6. **Output**: Return ONLY the JSON object matching the schema.

Markdown Content:
${markdown}`
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: docSchema,
        temperature: 0.2, // Low temperature for consistent formatting
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from AI");

    const parsedData = JSON.parse(jsonText) as ConvertedDocument;
    return parsedData;

  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    throw new Error("Failed to process document with AI.");
  }
};
