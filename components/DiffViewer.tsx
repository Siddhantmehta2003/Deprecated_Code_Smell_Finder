import React from 'react';

interface DiffViewerProps {
  oldCode: string;
  newCode: string;
  context?: string;
  isVisible: boolean;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ oldCode, newCode, context, isVisible }) => {
  if (!isVisible) return null;

  const oldLines = oldCode.split('\n');
  const newLines = newCode.split('\n');
  const maxLines = Math.max(oldLines.length, newLines.length);

  return (
    <div className="mt-6 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500 shadow-lg bg-white dark:bg-slate-900">
      <div className="bg-slate-50 dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
           <div className="p-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
             </svg>
           </div>
           <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Code Migration Preview</h3>
        </div>
        <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="w-2.5 h-2.5 bg-[#ffebe9] dark:bg-red-900/30 border border-[#ff818266] dark:border-red-800/50 rounded-sm"></span>
                Deleted
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="w-2.5 h-2.5 bg-[#e6ffec] dark:bg-green-900/30 border border-[#4ac26b66] dark:border-green-800/50 rounded-sm"></span>
                Added
            </span>
        </div>
      </div>
      
      {context && (
         <div className="bg-slate-50/50 dark:bg-slate-800/50 px-4 py-2 border-b border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 font-mono italic">
           <span className="font-semibold text-slate-700 dark:text-slate-300">Migration Rule:</span> {context}
         </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono border-collapse table-fixed min-w-[600px]">
            <colgroup>
                <col className="w-12" /> {/* Old Line Num */}
                <col className="w-[50%]" /> {/* Old Content */}
                <col className="w-12" /> {/* New Line Num */}
                <col className="w-[50%]" /> {/* New Content */}
            </colgroup>
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                    <th colSpan={2} className="py-1 px-2 text-center border-r border-slate-200 dark:border-slate-700">Original (Deprecated)</th>
                    <th colSpan={2} className="py-1 px-2 text-center">New (Compatible)</th>
                </tr>
            </thead>
            <tbody>
                {Array.from({ length: maxLines }).map((_, i) => {
                    const oldLine = oldLines[i];
                    const newLine = newLines[i];
                    return (
                        <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                            {/* Left Side (Old) */}
                            <td className="bg-[#fff5f5] dark:bg-[#450a0a] text-slate-400 dark:text-slate-500 text-right pr-2 py-1 select-none border-r border-[#ffdce0] dark:border-red-900/30 align-top">
                                {oldLine !== undefined ? i + 1 : ''}
                            </td>
                            <td className={`align-top py-1 px-2 border-r border-slate-200 dark:border-slate-700 overflow-hidden text-ellipsis whitespace-pre-wrap ${oldLine !== undefined ? 'bg-[#ffebe9] dark:bg-[#450a0a]/50' : 'bg-slate-50 dark:bg-slate-900'}`}>
                                {oldLine !== undefined ? (
                                    <span className="text-slate-800 dark:text-slate-200 break-all">
                                        <span className="select-none text-red-500/50 mr-1">-</span>
                                        {oldLine}
                                    </span>
                                ) : null}
                            </td>

                            {/* Right Side (New) */}
                            <td className="bg-[#f0fff4] dark:bg-[#052e16] text-slate-400 dark:text-slate-500 text-right pr-2 py-1 select-none border-r border-[#ccffd8] dark:border-green-900/30 align-top">
                                {newLine !== undefined ? i + 1 : ''}
                            </td>
                            <td className={`align-top py-1 px-2 overflow-hidden text-ellipsis whitespace-pre-wrap ${newLine !== undefined ? 'bg-[#e6ffec] dark:bg-[#052e16]/50' : 'bg-slate-50 dark:bg-slate-900'}`}>
                                {newLine !== undefined ? (
                                    <span className="text-slate-800 dark:text-slate-200 break-all">
                                        <span className="select-none text-green-500/50 mr-1">+</span>
                                        {newLine}
                                    </span>
                                ) : null}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
      </div>
    </div>
  );
};