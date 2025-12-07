import React from 'react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, placeholder }) => {
  return (
    <div className="relative w-full h-64 border border-slate-200 rounded-lg overflow-hidden bg-slate-950 text-slate-50 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
      <div className="absolute top-0 left-0 right-0 bg-slate-900 px-4 py-2 text-xs text-slate-400 border-b border-slate-800 flex justify-between items-center">
        <span>Input Source</span>
        <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">Editor</span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-full pt-10 p-4 bg-transparent border-none resize-none focus:outline-none font-mono text-sm leading-relaxed"
        spellCheck={false}
      />
    </div>
  );
};
