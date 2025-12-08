import React, { useRef, useImperativeHandle, forwardRef } from 'react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export interface CodeEditorHandle {
  highlight: (text: string) => void;
}

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(({ value, onChange, placeholder }, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    highlight: (text: string) => {
      if (!textareaRef.current || !text) return;

      const index = value.indexOf(text);
      if (index >= 0) {
        const textarea = textareaRef.current;
        
        // Focus the textarea
        textarea.focus();
        
        // Select the text range
        textarea.setSelectionRange(index, index + text.length);
        
        // Calculate rough scroll position (approximate line height logic)
        // This helps center the selection vertically if possible
        const textBefore = value.substring(0, index);
        const lineCount = textBefore.split('\n').length;
        const lineHeight = 24; // Approximation based on font-size + line-height
        
        // Scroll logic: try to put the line in the middle
        const targetScroll = (lineCount - 1) * lineHeight - (textarea.clientHeight / 2);
        textarea.scrollTop = Math.max(0, targetScroll);
      }
    }
  }));

  return (
    <div className="relative w-full h-64 border border-slate-200 rounded-lg overflow-hidden bg-slate-950 text-slate-50 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
      <div className="absolute top-0 left-0 right-0 bg-slate-900 px-4 py-2 text-xs text-slate-400 border-b border-slate-800 flex justify-between items-center">
        <span>Input Source</span>
        <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">Editor</span>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-full pt-10 p-4 bg-transparent border-none resize-none focus:outline-none font-mono text-sm leading-relaxed selection:bg-blue-500 selection:text-white"
        spellCheck={false}
      />
    </div>
  );
});

CodeEditor.displayName = 'CodeEditor';