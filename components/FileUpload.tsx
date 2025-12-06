import React, { useCallback } from 'react';
import { Upload, FileText } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.md')) {
        onFileSelect(file);
      } else {
        alert("Please upload a .md file");
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="w-full max-w-xl mx-auto mt-10 p-10 border-2 border-dashed border-obsidian-300 rounded-xl bg-white/50 backdrop-blur-sm hover:bg-white/80 transition-all cursor-pointer group flex flex-col items-center justify-center gap-4 shadow-lg hover:shadow-xl hover:border-obsidian-500"
      onClick={() => document.getElementById('fileInput')?.click()}
    >
      <input
        type="file"
        id="fileInput"
        accept=".md"
        className="hidden"
        onChange={handleInputChange}
      />
      <div className="p-4 bg-obsidian-100 rounded-full group-hover:bg-obsidian-200 transition-colors">
        <Upload className="w-8 h-8 text-obsidian-600" />
      </div>
      <div className="text-center">
        <h3 className="text-xl font-semibold text-obsidian-900">Drop your Obsidian file here</h3>
        <p className="text-obsidian-600 mt-2">or click to browse (.md)</p>
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm text-obsidian-500 bg-obsidian-50 px-3 py-1 rounded-full">
        <FileText className="w-4 h-4" />
        Supports Markdown & Wikilinks
      </div>
    </div>
  );
};
