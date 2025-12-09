import React, { useRef, useImperativeHandle, forwardRef } from 'react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  highlights?: string[]; // Changed from single highlight string to array
  highlightColor?: 'red' | 'green';
}

export interface CodeEditorHandle {
  highlight: (text: string) => void;
}

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(({ 
  value, 
  onChange, 
  placeholder, 
  readOnly, 
  className = "h-64",
  highlights = [],
  highlightColor
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    highlight: (text: string) => {
      if (!textareaRef.current || !text) return;

      const index = value.indexOf(text);
      if (index >= 0) {
        const textarea = textareaRef.current;
        textarea.focus();
        textarea.setSelectionRange(index, index + text.length);
        
        const textBefore = value.substring(0, index);
        const lineCount = textBefore.split('\n').length;
        const lineHeight = 20; // Approx line height in px based on text-sm
        
        const targetScroll = (lineCount - 1) * lineHeight - (textarea.clientHeight / 3);
        textarea.scrollTop = Math.max(0, targetScroll);
      }
    }
  }));

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const { scrollTop, scrollLeft } = e.currentTarget;
    if (backdropRef.current) {
        backdropRef.current.scrollTop = scrollTop;
        backdropRef.current.scrollLeft = scrollLeft;
    }
    if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = scrollTop;
    }
  };

  const renderHighlights = () => {
    if (!highlights || highlights.length === 0 || !value) return value;
    
    const highlightClass = highlightColor === 'red' 
        ? 'bg-red-500/30 text-red-100/20' 
        : 'bg-green-500/30 text-green-100/20';

    // Find all occurrences of highlights
    const ranges: {start: number, end: number}[] = [];
    
    // We iterate through highlights and find their position in the text.
    // For simplicity in this view, we find the first occurrence of each unique highlight snippet.
    // This matches the behavior of our simple search-and-replace logic.
    [...new Set(highlights)].forEach(h => {
        if (!h) return;
        const index = value.indexOf(h);
        if (index !== -1) {
            ranges.push({ start: index, end: index + h.length });
        }
    });

    // Sort ranges by start position
    ranges.sort((a, b) => a.start - b.start);

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    ranges.forEach((range, i) => {
        if (range.start < lastIndex) return; // Skip overlaps

        // Text before highlight
        if (range.start > lastIndex) {
            elements.push(value.substring(lastIndex, range.start));
        }

        // Highlighted text
        elements.push(
            <span key={`${range.start}-${i}`} className={`${highlightClass} inline-block shadow-[0_0_0_2px_rgba(0,0,0,0)] rounded-sm`}>
                {value.substring(range.start, range.end)}
            </span>
        );

        lastIndex = range.end;
    });

    // Remaining text
    if (lastIndex < value.length) {
        elements.push(value.substring(lastIndex));
    }

    return <>{elements}</>;
  };

  const lineCount = value.split('\n').length;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 1) }, (_, i) => i + 1).join('\n');

  return (
    <div className={`relative w-full border border-slate-200 rounded-lg overflow-hidden bg-slate-950 text-slate-50 transition-all flex flex-col ${readOnly ? 'opacity-100' : 'focus-within:ring-2 focus-within:ring-blue-500'} ${className}`}>
      {/* Header */}
      <div className="flex-none bg-slate-900 px-4 py-2 text-xs text-slate-400 border-b border-slate-800 flex justify-between items-center z-20">
        <span>{readOnly ? (highlightColor === 'red' ? 'Original Source' : 'Updated Source') : 'Editor Input'}</span>
        <div className="flex items-center gap-2">
            <span className="font-mono opacity-50">{lineCount} lines</span>
            <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${readOnly ? 'bg-slate-800 text-slate-300' : 'bg-blue-900/30 text-blue-200 border border-blue-900'}`}>
            {readOnly ? 'Read Only' : 'Editable'}
            </span>
        </div>
      </div>
      
      <div className="relative flex-1 min-h-0 flex">
         {/* Line Numbers */}
         <div 
            ref={lineNumbersRef}
            className="flex-none w-10 bg-slate-900 text-slate-600 text-right pr-2 pt-4 text-sm font-mono leading-relaxed select-none overflow-hidden"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
         >
            {lineNumbers}
         </div>

         <div className="relative flex-1 min-w-0">
            {/* Backdrop for Highlights */}
            <div 
                ref={backdropRef}
                className="absolute inset-0 p-4 font-mono text-sm leading-relaxed whitespace-pre overflow-hidden text-transparent pointer-events-none select-none z-0"
                style={{ 
                    fontFamily: 'JetBrains Mono, monospace', 
                }}
            >
                {renderHighlights()}
            </div>

            {/* Actual Textarea */}
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => !readOnly && onChange(e.target.value)}
                onScroll={handleScroll}
                placeholder={placeholder}
                readOnly={readOnly}
                className={`absolute inset-0 w-full h-full p-4 bg-transparent border-none resize-none focus:outline-none font-mono text-sm leading-relaxed whitespace-pre overflow-auto z-10 selection:bg-blue-500/40 selection:text-white ${readOnly ? 'cursor-default' : ''}`}
                spellCheck={false}
                style={{ 
                    fontFamily: 'JetBrains Mono, monospace',
                }}
            />
         </div>
      </div>
    </div>
  );
});

CodeEditor.displayName = 'CodeEditor';