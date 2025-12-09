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
    [Severity.CRITICAL]: 'border-l-red-500 text-red-700 bg-red-50',
    [Severity.WARNING]: 'border-l-amber-500 text-amber-700 bg-amber-50',
    [Severity.INFO]: 'border-l-blue-500 text-blue-700 bg-blue-50',
  };

  const badgeColors = {
    [Severity.CRITICAL]: 'bg-red-100 text-red-800 border-red-200',
    [Severity.WARNING]: 'bg-amber-100 text-amber-800 border-amber-200',
    [Severity.INFO]: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  // Prediction specific styles (Magical/Future theme)
  const containerClass = isPrediction
    ? 'border border-violet-200 bg-white shadow-md hover:shadow-lg hover:shadow-violet-100'
    : 'border border-slate-200 bg-white shadow-sm hover:shadow-md';
  
  const headerClass = isPrediction
    ? 'bg-gradient-to-r from-violet-50 to-white border-l-4 border-l-violet-500 text-slate-800'
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
            
            <span className="text-[10px] text-slate-500 font-medium border border-slate-200 px-2 py-0.5 rounded bg-white uppercase tracking-wide">
              {issue.category}
            </span>
            
            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <span>EOL:</span>
              <span className={isPrediction ? "text-violet-600 font-bold" : ""}>{issue.estimatedEndOfLife}</span>
            </span>
          </div>

          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
             {issue.title}
          </h3>
          <p className="text-sm text-slate-600 mt-1 line-clamp-1 opacity-80">{issue.description}</p>
          
          {/* Prediction specific preview stats */}
          {isPrediction && issue.predictionConfidence && (
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
               <div className="flex items-center gap-2 bg-violet-50 px-2 py-1 rounded border border-violet-100">
                  <span className="text-xs font-bold text-violet-800 uppercase tracking-tight">Deprecation Probability</span>
                  <div className="h-2.5 w-24 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
                     <div 
                       className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full" 
                       style={{ width: `${issue.predictionConfidence}%` }}
                     />
                  </div>
                  <span className="text-xs font-mono font-bold text-violet-700">{issue.predictionConfidence}%</span>
               </div>
               
               <div className="flex gap-1">
                 {issue.riskFactors?.slice(0, 2).map((risk, i) => (
                   <span key={i} className="text-[10px] px-1.5 py-1 bg-white text-slate-600 rounded border border-slate-200 shadow-sm">
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
        <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Prediction Explanation Section */}
          {isPrediction && issue.riskFactors && (
             <div className="bg-violet-50 border border-violet-100 rounded-md p-3">
               <h4 className="text-xs font-bold text-violet-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                 Why we predicted this?
               </h4>
               <div className="flex flex-wrap gap-2">
                 {issue.riskFactors.map((risk, idx) => (
                   <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-violet-100 text-xs text-violet-700 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                      {risk}
                   </span>
                 ))}
               </div>
             </div>
          )}

          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Detailed Analysis</h4>
            <p className="text-sm text-slate-700 leading-relaxed">{issue.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center h-4">
                <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wider flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> Problematic Code
                </h4>
                {onLocate && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLocate(issue);
                    }}
                    className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded shadow-sm hover:bg-slate-50 hover:text-slate-900 hover:border-blue-300 transition-all font-medium flex items-center gap-1 group"
                  >
                    <svg className="w-3 h-3 text-slate-400 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Locate
                  </button>
                )}
              </div>
              <div className="relative group">
                <pre className="bg-white border border-red-100 rounded-md p-3 text-xs font-mono text-slate-700 overflow-x-auto shadow-sm">
                  <code>{issue.affectedCode}</code>
                </pre>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center h-4">
                 <h4 className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1 ${isPrediction ? 'text-violet-600' : 'text-green-600'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${isPrediction ? 'bg-violet-500' : 'bg-green-500'}`}></div> 
                    {isPrediction ? 'Future-Proof Replacement' : 'Suggested Fix'}
                 </h4>
                 {onApplyFix && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onApplyFix(issue);
                      }}
                      className={`text-[10px] text-white px-2.5 py-1 rounded shadow-sm transition-colors font-medium flex items-center gap-1 active:transform active:scale-95 ${isPrediction ? 'bg-violet-600 hover:bg-violet-700' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Apply Fix
                    </button>
                 )}
              </div>
              <pre className={`border rounded-md p-3 text-xs font-mono overflow-x-auto shadow-inner mt-2 ${isPrediction ? 'bg-violet-50 border-violet-200 text-violet-900' : 'bg-green-50 border-green-200 text-green-900'}`}>
                <code>{issue.replacementCode}</code>
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};