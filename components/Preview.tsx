import React from 'react';
import { ConvertedDocument, DocBlock } from '../types';
import { FileDown, ArrowLeft, FileText, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

interface PreviewProps {
  data: ConvertedDocument;
  onDownload: () => void;
  onReset: () => void;
}

export const Preview: React.FC<PreviewProps> = ({ data, onDownload, onReset }) => {
  
  const renderBlock = (block: DocBlock, index: number) => {
    const content = block.content.map((run, i) => (
      <span
        key={i}
        className={clsx(
          run.bold && "font-bold",
          run.italic && "italic",
          run.code && "font-mono bg-gray-100 px-1 rounded text-pink-600 text-sm",
          run.strike && "line-through"
        )}
      >
        {run.text}
      </span>
    ));

    switch (block.type) {
      case 'heading':
        const Tag = `h${Math.min(block.level || 1, 6)}` as React.ElementType;
        const sizeClasses = {
            1: 'text-3xl font-bold mt-6 mb-4 border-b pb-2 border-gray-200',
            2: 'text-2xl font-bold mt-5 mb-3',
            3: 'text-xl font-bold mt-4 mb-2',
            4: 'text-lg font-bold mt-3 mb-2',
            5: 'text-base font-bold mt-2',
            6: 'text-sm font-bold mt-2'
        };
        return <Tag key={index} className={clsx("text-slate-800", sizeClasses[Math.min(block.level || 1, 6) as 1|2|3|4|5|6])}>{content}</Tag>;
      
      case 'bullet_list':
        return (
            <div key={index} className="ml-4 flex items-start">
                 <span className="mr-2 text-slate-500">•</span>
                 <p className="mb-1 text-slate-700 leading-relaxed">{content}</p>
            </div>
        );
      
      case 'numbered_list':
        return (
            <div key={index} className="ml-4 flex items-start">
                 <span className="mr-2 text-slate-500 font-mono text-sm">1.</span>
                 <p className="mb-1 text-slate-700 leading-relaxed">{content}</p>
            </div>
        );

      case 'code_block':
        return (
            <pre key={index} className="bg-slate-50 border border-slate-200 p-4 rounded-lg my-4 overflow-x-auto text-sm font-mono text-slate-800">
                {content}
            </pre>
        );

      case 'quote':
        return (
            <blockquote key={index} className="border-l-4 border-obsidian-400 pl-4 my-4 italic text-slate-600 bg-obsidian-50/50 py-2 rounded-r">
                {content}
            </blockquote>
        );

      case 'paragraph':
      default:
        return <p key={index} className="mb-3 text-slate-700 leading-relaxed">{content}</p>;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-full">
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-6 sticky top-0 bg-obsidian-50/90 backdrop-blur z-10 py-4 border-b border-obsidian-200">
         <button 
            onClick={onReset}
            className="flex items-center gap-2 text-obsidian-600 hover:text-obsidian-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-obsidian-100"
         >
            <ArrowLeft className="w-4 h-4" />
            Back
         </button>
         
         <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 text-green-600 text-sm font-medium bg-green-50 px-3 py-1 rounded-full border border-green-100">
                 <CheckCircle className="w-4 h-4" />
                 AI Cleaned & Formatted
             </div>
            <button
                onClick={onDownload}
                className="flex items-center gap-2 bg-obsidian-600 hover:bg-obsidian-700 text-white px-6 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all font-medium"
            >
                <FileDown className="w-5 h-5" />
                Download .docx
            </button>
         </div>
      </div>

      {/* Document Preview Paper */}
      <div className="bg-white shadow-2xl rounded-xl min-h-[800px] p-12 md:p-16 border border-slate-200 mx-4 md:mx-0 relative overflow-hidden">
        {/* Paper texture overlay (subtle) */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`}}></div>
        
        <div className="relative z-0">
            <h1 className="text-4xl font-bold text-slate-900 mb-8 pb-4 border-b-2 border-slate-900 text-center">{data.title}</h1>
            <div className="space-y-2">
                {data.blocks.map((block, idx) => renderBlock(block, idx))}
            </div>
        </div>
      </div>
      
      <div className="h-20"></div> {/* Spacer */}
    </div>
  );
};