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
    <div className="mt-6 border border-slate-200 rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500 shadow-lg bg-white">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
        <div className="flex items-center gap-2">
           <div className="p-1 bg-blue-100 text-blue-600 rounded">
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
             </svg>
           </div>
           <h3 className="text-sm font-bold text-slate-700">Code Migration Preview</h3>
        </div>
        <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-2.5 h-2.5 bg-[#ffebe9] border border-[#ff818266] rounded-sm"></span>
                Deleted
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-2.5 h-2.5 bg-[#e6ffec] border border-[#4ac26b66] rounded-sm"></span>
                Added
            </span>
        </div>
      </div>
      
      {context && (
         <div className="bg-slate-50/50 px-4 py-2 border-b border-slate-100 text-xs text-slate-500 font-mono italic">
           <span className="font-semibold text-slate-700">Migration Rule:</span> {context}
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
            <thead className="bg-slate-100 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                    <th colSpan={2} className="py-1 px-2 text-center border-r border-slate-200">Original (Deprecated)</th>
                    <th colSpan={2} className="py-1 px-2 text-center">New (Compatible)</th>
                </tr>
            </thead>
            <tbody>
                {Array.from({ length: maxLines }).map((_, i) => {
                    const oldLine = oldLines[i];
                    const newLine = newLines[i];
                    return (
                        <tr key={i} className="border-b border-slate-100 last:border-0">
                            {/* Left Side (Old) */}
                            <td className="bg-[#fff5f5] text-slate-400 text-right pr-2 py-1 select-none border-r border-[#ffdce0] align-top">
                                {oldLine !== undefined ? i + 1 : ''}
                            </td>
                            <td className={`align-top py-1 px-2 border-r border-slate-200 overflow-hidden text-ellipsis whitespace-pre-wrap ${oldLine !== undefined ? 'bg-[#ffebe9]' : 'bg-slate-50'}`}>
                                {oldLine !== undefined ? (
                                    <span className="text-slate-800 break-all">
                                        <span className="select-none text-red-500/50 mr-1">-</span>
                                        {oldLine}
                                    </span>
                                ) : null}
                            </td>

                            {/* Right Side (New) */}
                            <td className="bg-[#f0fff4] text-slate-400 text-right pr-2 py-1 select-none border-r border-[#ccffd8] align-top">
                                {newLine !== undefined ? i + 1 : ''}
                            </td>
                            <td className={`align-top py-1 px-2 overflow-hidden text-ellipsis whitespace-pre-wrap ${newLine !== undefined ? 'bg-[#e6ffec]' : 'bg-slate-50'}`}>
                                {newLine !== undefined ? (
                                    <span className="text-slate-800 break-all">
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