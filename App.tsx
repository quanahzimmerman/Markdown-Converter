import React, { useState, useCallback } from 'react';
import { AppState, OutputFormat, ConversionFile } from './types';
import { convertToDocx } from './services/docxConverter';
import { convertToPdf } from './services/pdfConverter';
import { convertToTxt } from './services/txtConverter';
import { FileText, FileType, FileOutput, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';
import clsx from 'clsx';

const formatOptions: { format: OutputFormat; label: string; icon: React.ReactNode; color: string }[] = [
  { format: 'docx', label: 'Word (.docx)', icon: <FileText className="w-6 h-6" />, color: 'bg-blue-500 hover:bg-blue-600' },
  { format: 'pdf', label: 'PDF (.pdf)', icon: <FileType className="w-6 h-6" />, color: 'bg-red-500 hover:bg-red-600' },
  { format: 'txt', label: 'Text (.txt)', icon: <FileOutput className="w-6 h-6" />, color: 'bg-gray-500 hover:bg-gray-600' },
];

export default function App() {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [file, setFile] = useState<ConversionFile | null>(null);
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.md')) {
      const content = await droppedFile.text();
      setFile({ name: droppedFile.name, content });
      setState(AppState.FILE_LOADED);
      setError('');
    } else {
      setError('Please drop a .md (Markdown) file');
      setState(AppState.ERROR);
    }
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.name.endsWith('.md')) {
      const content = await selectedFile.text();
      setFile({ name: selectedFile.name, content });
      setState(AppState.FILE_LOADED);
      setError('');
    } else if (selectedFile) {
      setError('Please select a .md (Markdown) file');
      setState(AppState.ERROR);
    }
  }, []);

  const handleConvert = async (format: OutputFormat) => {
    if (!file) return;

    setState(AppState.PROCESSING);
    try {
      const baseName = file.name.replace(/\.md$/, '');

      switch (format) {
        case 'docx':
          await convertToDocx(file.content, baseName);
          break;
        case 'pdf':
          await convertToPdf(file.content, baseName);
          break;
        case 'txt':
          await convertToTxt(file.content, baseName);
          break;
      }

      setState(AppState.SUCCESS);
      setTimeout(() => setState(AppState.FILE_LOADED), 2000);
    } catch (err: any) {
      setError(err.message || 'Conversion failed');
      setState(AppState.ERROR);
    }
  };

  const handleReset = () => {
    setFile(null);
    setState(AppState.IDLE);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-xl backdrop-blur">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Markdown Converter</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-xl">

          {/* Drop Zone - Show when IDLE or ERROR without file */}
          {(state === AppState.IDLE || (state === AppState.ERROR && !file)) && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={clsx(
                "relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300",
                isDragging
                  ? "border-purple-400 bg-purple-500/20 scale-105"
                  : "border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10"
              )}
            >
              <div className="flex flex-col items-center gap-4">
                <div className={clsx(
                  "p-4 rounded-full transition-colors",
                  isDragging ? "bg-purple-500/30" : "bg-white/10"
                )}>
                  <FileText className={clsx(
                    "w-12 h-12 transition-colors",
                    isDragging ? "text-purple-300" : "text-white/60"
                  )} />
                </div>
                <div>
                  <p className="text-white text-lg font-medium mb-1">
                    Drop your Markdown file here
                  </p>
                  <p className="text-white/50 text-sm">or click to browse</p>
                </div>
              </div>
              <input
                type="file"
                accept=".md"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          )}

          {/* File Loaded - Format Selection */}
          {(state === AppState.FILE_LOADED || (state === AppState.ERROR && file)) && file && (
            <div className="bg-white/10 backdrop-blur rounded-2xl p-8">
              {/* File Info */}
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="bg-green-500/20 p-2 rounded-lg">
                    <FileText className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{file.name}</p>
                    <p className="text-white/50 text-sm">{(file.content.length / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              {/* Format Selection */}
              <p className="text-white/70 text-sm mb-4">Choose output format:</p>
              <div className="grid grid-cols-3 gap-3">
                {formatOptions.map(({ format, label, icon, color }) => (
                  <button
                    key={format}
                    onClick={() => handleConvert(format)}
                    className={clsx(
                      "flex flex-col items-center gap-2 p-4 rounded-xl text-white transition-all",
                      color,
                      "hover:scale-105 active:scale-95"
                    )}
                  >
                    {icon}
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>

              {state === AppState.ERROR && (
                <div className="mt-4 p-3 bg-red-500/20 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span className="text-red-300 text-sm">{error}</span>
                </div>
              )}
            </div>
          )}

          {/* Processing */}
          {state === AppState.PROCESSING && (
            <div className="bg-white/10 backdrop-blur rounded-2xl p-12 text-center">
              <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
              <p className="text-white font-medium">Converting...</p>
            </div>
          )}

          {/* Success */}
          {state === AppState.SUCCESS && (
            <div className="bg-white/10 backdrop-blur rounded-2xl p-12 text-center">
              <div className="bg-green-500/20 p-4 rounded-full inline-block mb-4">
                <CheckCircle className="w-12 h-12 text-green-400" />
              </div>
              <p className="text-white font-medium">Conversion complete!</p>
              <p className="text-white/50 text-sm mt-1">Your file has been saved</p>
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-white/30 text-sm">
        Supports Markdown to DOCX, PDF, and TXT
      </footer>
    </div>
  );
}
