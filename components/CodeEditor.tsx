import React, { useRef, useImperativeHandle, forwardRef } from 'react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  highlights?: string[]; // Array of strings to highlight
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
      if (!textareaRef.current || !text || !value) return;

      // Normalize string for searching (simple trim for now)
      const searchTarget = text.trim();
      // Find the text in the current value. 
      // We look for the exact substring first, then try trimming
      let index = value.indexOf(text);
      if (index === -1) {
          index = value.indexOf(searchTarget);
      }

      if (index >= 0) {
        const textarea = textareaRef.current;
        textarea.focus();
        textarea.setSelectionRange(index, index + text.length);
        
        // Calculate scroll position
        const textBefore = value.substring(0, index);
        const lineCount = textBefore.split('\n').length;
        const lineHeight = 20; // Approx line height in px based on text-sm
        
        // Center the line in the view
        const targetScroll = (lineCount - 1) * lineHeight - (textarea.clientHeight / 2) + lineHeight;
        
        textarea.scrollTo({
            top: Math.max(0, targetScroll),
            behavior: 'smooth'
        });
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
        ? 'bg-red-500/30 text-transparent animate-pulse' 
        : 'bg-green-500/30 text-transparent animate-pulse';

    // Find all occurrences of highlights
    const ranges: {start: number, end: number}[] = [];
    
    [...new Set(highlights)].forEach(h => {
        if (!h) return;
        // Simple global search for exact matches
        let pos = 0;
        const searchStr = h;
        while (pos < value.length) {
            const index = value.indexOf(searchStr, pos);
            if (index === -1) break;
            ranges.push({ start: index, end: index + searchStr.length });
            pos = index + 1; 
        }
    });

    // Sort ranges by start position
    ranges.sort((a, b) => a.start - b.start);

    // Merge overlapping ranges
    const mergedRanges: {start: number, end: number}[] = [];
    ranges.forEach(range => {
        if (mergedRanges.length === 0) {
            mergedRanges.push(range);
        } else {
            const prev = mergedRanges[mergedRanges.length - 1];
            if (range.start < prev.end) {
                prev.end = Math.max(prev.end, range.end);
            } else {
                mergedRanges.push(range);
            }
        }
    });

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    mergedRanges.forEach((range, i) => {
        // Text before highlight
        if (range.start > lastIndex) {
            elements.push(value.substring(lastIndex, range.start));
        }

        // Highlighted text
        elements.push(
            <span key={`${range.start}-${i}`} className={`${highlightClass} inline-block rounded-sm`}>
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
    <div className={`relative w-full border rounded-lg overflow-hidden transition-all flex flex-col ${readOnly ? 'opacity-100' : 'focus-within:ring-2 focus-within:ring-blue-500'} ${className} bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700`}>
      {/* Header */}
      <div className="flex-none px-4 py-2 text-xs border-b flex justify-between items-center z-20 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
        <span className="font-semibold text-slate-700 dark:text-slate-300">{readOnly ? (highlightColor === 'red' ? 'Original / Deprecated' : 'New / Migrated') : 'Code Editor'}</span>
        <div className="flex items-center gap-2">
            <span className="font-mono opacity-50">{lineCount} lines</span>
            <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${readOnly ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-200 border border-blue-200 dark:border-blue-900'}`}>
            {readOnly ? 'Read Only' : 'Editable'}
            </span>
        </div>
      </div>
      
      <div className="relative flex-1 min-h-0 flex">
         {/* Line Numbers */}
         <div 
            ref={lineNumbersRef}
            className="flex-none w-10 text-right pr-2 pt-4 text-sm font-mono leading-relaxed select-none overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600"
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
                className={`absolute inset-0 w-full h-full p-4 bg-transparent border-none resize-none focus:outline-none font-mono text-sm leading-relaxed whitespace-pre overflow-auto z-10 text-slate-900 dark:text-slate-100 selection:bg-blue-500/40 selection:text-white ${readOnly ? 'cursor-default' : ''}`}
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