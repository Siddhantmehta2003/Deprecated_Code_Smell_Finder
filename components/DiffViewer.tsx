import React from 'react';

interface DiffViewerProps {
  oldCode: string;
  newCode: string;
  context?: string;
  isVisible: boolean;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ oldCode, newCode, context, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          Proposed Changes Preview
        </h3>
        <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-mono">Diff View</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 text-xs font-mono">
        {/* Original Side */}
        <div className="border-r border-slate-200 bg-red-50/30">
          <div className="px-3 py-1.5 border-b border-red-100 bg-red-50 text-red-700 font-medium flex justify-between">
            <span>Original</span>
            <span>-</span>
          </div>
          <div className="p-0 overflow-x-auto">
            {oldCode.split('\n').map((line, i) => (
              <div key={i} className="flex bg-red-50/50">
                <span className="w-8 flex-shrink-0 text-slate-400 text-right pr-2 select-none border-r border-red-100/50 bg-red-50/30 py-1">{i + 1}</span>
                <span className="pl-2 pr-4 py-1 text-red-900 whitespace-pre block w-full">{line}</span>
              </div>
            ))}
          </div>
        </div>

        {/* New Side */}
        <div className="bg-green-50/30">
          <div className="px-3 py-1.5 border-b border-green-100 bg-green-50 text-green-700 font-medium flex justify-between">
            <span>Replacement</span>
            <span>+</span>
          </div>
          <div className="p-0 overflow-x-auto">
            {newCode.split('\n').map((line, i) => (
              <div key={i} className="flex bg-green-50/50">
                <span className="w-8 flex-shrink-0 text-slate-400 text-right pr-2 select-none border-r border-green-100/50 bg-green-50/30 py-1">{i + 1}</span>
                <span className="pl-2 pr-4 py-1 text-green-900 whitespace-pre block w-full">{line}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {context && (
         <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 text-[10px] text-slate-500 font-mono">
           Context: ... {context.substring(0, 60)} ...
         </div>
      )}
    </div>
  );
};