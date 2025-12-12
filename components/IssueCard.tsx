import React, { useState } from 'react';
import { Issue, Severity } from '../types';

interface IssueCardProps {
  issue: Issue;
  onApplyFix?: (issue: Issue) => void;
  onLocate?: (issue: Issue) => void;
}

export const IssueCard: React.FC<IssueCardProps> = ({ issue, onApplyFix, onLocate }) => {
  const [expanded, setExpanded] = useState(false);

  // Styling logic based on Prediction vs Standard Issue
  const isPrediction = issue.isPrediction;

  const severityColors = {
    [Severity.CRITICAL]: 'border-l-red-500 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/10',
    [Severity.WARNING]: 'border-l-amber-500 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10',
    [Severity.INFO]: 'border-l-blue-500 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10',
  };

  const badgeColors = {
    [Severity.CRITICAL]: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800',
    [Severity.WARNING]: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    [Severity.INFO]: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  };

  // Prediction specific styles (Magical/Future theme)
  const containerClass = isPrediction
    ? 'border border-violet-200 dark:border-violet-900/50 bg-white dark:bg-slate-900 shadow-md hover:shadow-lg hover:shadow-violet-100 dark:hover:shadow-violet-900/20'
    : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md';
  
  const headerClass = isPrediction
    ? 'bg-gradient-to-r from-violet-50 to-white dark:from-violet-900/10 dark:to-slate-900 border-l-4 border-l-violet-500 text-slate-800 dark:text-slate-200'
    : `${severityColors[issue.severity]} border-l-4`;

  return (
    <div className={`rounded-lg overflow-hidden transition-all duration-300 ${containerClass}`}>
      <div 
        className={`p-4 cursor-pointer flex justify-between items-start ${headerClass}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1">
          {/* Top Row Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {isPrediction ? (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-violet-600 text-white shadow-sm animate-pulse">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Future Prediction
              </span>
            ) : (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border ${badgeColors[issue.severity]}`}>
                {issue.severity}
              </span>
            )}
            
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded bg-white dark:bg-slate-800 uppercase tracking-wide">
              {issue.category}
            </span>
            
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1">
              <span>EOL:</span>
              <span className={isPrediction ? "text-violet-600 dark:text-violet-400 font-bold" : ""}>{issue.estimatedEndOfLife}</span>
            </span>
          </div>

          <h3 className="text-base font-semibold flex items-center gap-2">
             {issue.title}
          </h3>
          <p className="text-sm mt-1 line-clamp-1 opacity-80">{issue.description}</p>
          
          {/* Prediction specific preview stats */}
          {isPrediction && issue.predictionConfidence && (
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
               <div className="flex items-center gap-2 bg-violet-50 dark:bg-violet-900/20 px-2 py-1 rounded border border-violet-100 dark:border-violet-800">
                  <span className="text-xs font-bold text-violet-800 dark:text-violet-300 uppercase tracking-tight">Deprecation Probability</span>
                  <div className="h-2.5 w-24 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden border border-slate-300 dark:border-slate-600">
                     <div 
                       className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full" 
                       style={{ width: `${issue.predictionConfidence}%` }}
                     />
                  </div>
                  <span className="text-xs font-mono font-bold text-violet-700 dark:text-violet-300">{issue.predictionConfidence}%</span>
               </div>
               
               <div className="flex gap-1">
                 {issue.riskFactors?.slice(0, 2).map((risk, i) => (
                   <span key={i} className="text-[10px] px-1.5 py-1 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 shadow-sm">
                     {risk}
                   </span>
                 ))}
               </div>
            </div>
          )}
        </div>

        <div className="ml-4 text-slate-400 flex flex-col items-center justify-between h-full gap-2">
          {isPrediction && (
             <span className="text-2xl" role="img" aria-label="crystal ball">🔮</span>
          )}
          <svg 
            className={`w-5 h-5 transform transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} 
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Prediction Explanation Section */}
          {isPrediction && issue.riskFactors && (
             <div className="bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-900/30 rounded-md p-3">
               <h4 className="text-xs font-bold text-violet-800 dark:text-violet-300 uppercase tracking-wider mb-2 flex items-center gap-1">
                 Why we predicted this?
               </h4>
               <div className="flex flex-wrap gap-2">
                 {issue.riskFactors.map((risk, idx) => (
                   <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-violet-100 dark:border-violet-900/30 text-xs text-violet-700 dark:text-violet-300 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                      {risk}
                   </span>
                 ))}
               </div>
             </div>
          )}

          <div>
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Detailed Analysis</h4>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{issue.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center h-6">
                <h4 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> Problematic Code
                </h4>
                {onLocate && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLocate(issue);
                    }}
                    className="group flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase rounded shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 hover:border-blue-300 dark:hover:border-blue-700 transition-all active:translate-y-0.5"
                    title="Scroll to code in editor and show diff"
                  >
                    <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Locate & Preview
                  </button>
                )}
              </div>
              <div className="relative group">
                <pre className="bg-white dark:bg-slate-950 border border-red-100 dark:border-red-900/30 rounded-md p-3 text-xs font-mono text-slate-700 dark:text-slate-300 overflow-x-auto shadow-sm">
                  <code>{issue.affectedCode}</code>
                </pre>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center h-6">
                 <h4 className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1 ${isPrediction ? 'text-violet-600 dark:text-violet-400' : 'text-green-600 dark:text-green-400'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${isPrediction ? 'bg-violet-500' : 'bg-green-500'}`}></div> 
                    {isPrediction ? 'Future-Proof Replacement' : 'Suggested Fix'}
                 </h4>
                 {onApplyFix && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onApplyFix(issue);
                      }}
                      className={`text-[10px] text-white px-3 py-1 rounded shadow-sm transition-colors font-medium flex items-center gap-1 active:transform active:scale-95 ${isPrediction ? 'bg-violet-600 hover:bg-violet-700' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Apply Fix
                    </button>
                 )}
              </div>
              <pre className={`border rounded-md p-3 text-xs font-mono overflow-x-auto shadow-inner ${isPrediction ? 'bg-violet-50 dark:bg-violet-900/10 border-violet-200 dark:border-violet-900/30 text-violet-900 dark:text-violet-300' : 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30 text-green-900 dark:text-green-300'}`}>
                <code>{issue.replacementCode}</code>
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};