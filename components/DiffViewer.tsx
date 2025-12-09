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
    <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 shadow-md">
      <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          Comparison Preview
        </h3>
        <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-mono border border-slate-300">
           GitHub Style Diff
        </span>
      </div>
      
      <div className="grid grid-cols-2 divide-x divide-slate-200 text-xs font-mono bg-white">
        {/* Original Side */}
        <div className="flex flex-col">
          <div className="bg-red-50/50 px-3 py-1.5 border-b border-red-100 text-red-700 font-semibold text-[10px] uppercase tracking-wide text-center">
            Original Code
          </div>
          <div className="overflow-x-auto p-0">
            {oldCode.split('\n').map((line, i) => (
              <div key={i} className="flex bg-red-50/20 hover:bg-red-50 transition-colors">
                <div className="w-8 flex-shrink-0 text-slate-400 text-right pr-2 select-none border-r border-slate-100 bg-slate-50 py-1 text-[10px] flex items-center justify-end">
                    {i + 1}
                </div>
                <div className="pl-2 pr-2 py-1 text-red-900 whitespace-pre w-full leading-relaxed">
                   <span className="select-none text-red-400 mr-1">-</span>
                   {line}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* New Side */}
        <div className="flex flex-col">
          <div className="bg-green-50/50 px-3 py-1.5 border-b border-green-100 text-green-700 font-semibold text-[10px] uppercase tracking-wide text-center">
            Suggested Replacement
          </div>
          <div className="overflow-x-auto p-0">
            {newCode.split('\n').map((line, i) => (
              <div key={i} className="flex bg-green-50/20 hover:bg-green-50 transition-colors">
                <div className="w-8 flex-shrink-0 text-slate-400 text-right pr-2 select-none border-r border-slate-100 bg-slate-50 py-1 text-[10px] flex items-center justify-end">
                    {i + 1}
                </div>
                <div className="pl-2 pr-2 py-1 text-green-900 whitespace-pre w-full leading-relaxed">
                    <span className="select-none text-green-500 mr-1">+</span>
                    {line}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {context && (
         <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 text-[10px] text-slate-500 font-mono italic">
           <span className="font-bold">Context:</span> {context}
         </div>
      )}
    </div>
  );
};