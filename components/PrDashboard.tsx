import React from 'react';
import { AnalysisReport, PrStatus } from '../types';
import { Button } from './Button';

interface PrDashboardProps {
  status: PrStatus;
  report: AnalysisReport | null;
  onFixAll: () => void;
  onBlock: () => void;
  onAllow: () => void;
}

export const PrDashboard: React.FC<PrDashboardProps> = ({ status, report, onFixAll, onBlock, onAllow }) => {
  if (status === 'idle') return null;

  const issueCount = report?.issues.length || 0;
  const criticalCount = report?.issues.filter(i => i.severity === 'Critical').length || 0;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2">
      {/* PR Status Header */}
      <div className={`rounded-xl border-2 p-6 mb-8 text-center shadow-sm transition-colors ${
        status === 'blocked' ? 'bg-red-50 border-red-200' :
        status === 'passed' ? 'bg-green-50 border-green-200' :
        'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex flex-col items-center gap-4">
          {status === 'checking' && (
            <>
               <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center animate-pulse">
                  <svg className="w-8 h-8 text-blue-600 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
               </div>
               <h2 className="text-xl font-bold text-slate-700">Intercepting Pull Request...</h2>
               <p className="text-slate-500">Scanning changed files for deprecations and future risks.</p>
            </>
          )}

          {status === 'blocked' && (
             <>
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center shadow-sm">
                   <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                </div>
                <div>
                   <h2 className="text-2xl font-bold text-red-700">PR Blocked: Deprecated Code Detected</h2>
                   <p className="text-red-600 mt-1">{issueCount} issues found ({criticalCount} critical) preventing merge.</p>
                </div>
             </>
          )}

          {status === 'passed' && (
             <>
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center shadow-sm">
                   <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                   </svg>
                </div>
                <div>
                   <h2 className="text-2xl font-bold text-green-700">All Checks Passed</h2>
                   <p className="text-green-600 mt-1">Codebase is future-proof and ready to merge.</p>
                </div>
             </>
          )}
        </div>
      </div>

      {status === 'blocked' && report && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Actions Panel */}
           <div className="lg:col-span-1 space-y-4">
              <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                 <h3 className="font-bold text-slate-900 mb-4">Merge Policies</h3>
                 <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-red-50 rounded border border-red-100">
                       <div className="w-2 h-2 rounded-full bg-red-500"></div>
                       <div className="text-sm">
                          <span className="font-semibold text-red-900">Critical Deprecations</span>
                          <p className="text-red-700 text-xs">Must be resolved</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-violet-50 rounded border border-violet-100">
                       <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                       <div className="text-sm">
                          <span className="font-semibold text-violet-900">Future Predictions</span>
                          <p className="text-violet-700 text-xs">Warning only (6-month grace)</p>
                       </div>
                    </div>
                 </div>

                 <div className="mt-6 space-y-3">
                    <Button onClick={onFixAll} className="w-full bg-slate-900 hover:bg-slate-800 shadow-lg group">
                        <span className="flex items-center justify-center gap-2">
                            <span>Auto-Migrate & Merge</span>
                            <svg className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </span>
                    </Button>
                    <div className="text-center text-xs text-slate-400 my-2">- OR -</div>
                    <button onClick={onBlock} className="w-full py-2 text-sm font-semibold text-red-600 border border-red-200 rounded bg-red-50 hover:bg-red-100 transition-colors">
                        Block Pull Request
                    </button>
                    <button onClick={onAllow} className="w-full py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors">
                        Override & Allow (Unsafe)
                    </button>
                 </div>
              </div>
           </div>

           {/* Diff List */}
           <div className="lg:col-span-2 space-y-4">
               <h3 className="font-bold text-slate-900 flex items-center gap-2">
                   Blocking Issues 
                   <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">{issueCount}</span>
               </h3>
               {report.issues.map((issue) => (
                   <div key={issue.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                       <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                           <div className="flex items-center gap-2">
                               <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                                   issue.severity === 'Critical' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200'
                               }`}>
                                   {issue.severity}
                               </span>
                               <span className="text-sm font-medium text-slate-700">{issue.title}</span>
                           </div>
                           <span className="text-xs text-slate-400 font-mono">File: src/main.ts</span> 
                       </div>
                       <div className="p-4 grid grid-cols-2 gap-4">
                           <div>
                               <div className="text-[10px] uppercase font-bold text-red-500 mb-1">Deprecated Code</div>
                               <pre className="text-xs bg-red-50 text-red-900 p-2 rounded border border-red-100 overflow-x-auto">
                                   <code>{issue.affectedCode}</code>
                               </pre>
                           </div>
                           <div>
                               <div className="text-[10px] uppercase font-bold text-green-500 mb-1">Migration</div>
                               <pre className="text-xs bg-green-50 text-green-900 p-2 rounded border border-green-100 overflow-x-auto">
                                   <code>{issue.replacementCode}</code>
                               </pre>
                           </div>
                       </div>
                   </div>
               ))}
           </div>
        </div>
      )}
    </div>
  );
};
