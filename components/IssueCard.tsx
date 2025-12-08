import React, { useState } from 'react';
import { Issue, Severity } from '../types';

interface IssueCardProps {
  issue: Issue;
  onApplyFix?: (issue: Issue) => void;
  onLocate?: (issue: Issue) => void;
}

export const IssueCard: React.FC<IssueCardProps> = ({ issue, onApplyFix, onLocate }) => {
  const [expanded, setExpanded] = useState(false);

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

  return (
    <div className={`border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
      <div 
        className={`p-4 cursor-pointer border-l-4 ${severityColors[issue.severity]} flex justify-between items-start`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border ${badgeColors[issue.severity]}`}>
              {issue.severity}
            </span>
            <span className="text-[10px] text-slate-500 font-medium border border-slate-200 px-2 py-0.5 rounded bg-white uppercase tracking-wide">
              {issue.category}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              EOL: {issue.estimatedEndOfLife}
            </span>
          </div>
          <h3 className="text-base font-semibold text-slate-900">{issue.title}</h3>
          <p className="text-sm text-slate-600 mt-1 line-clamp-1 opacity-80">{issue.description}</p>
        </div>
        <div className="ml-4 text-slate-400 flex items-center h-full">
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
                    title="Highlight in Editor & Show Diff"
                  >
                    <svg className="w-3 h-3 text-slate-400 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Locate & Preview
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
                 <h4 className="text-xs font-semibold text-green-600 uppercase tracking-wider flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Suggested Fix
                 </h4>
                 {onApplyFix && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onApplyFix(issue);
                      }}
                      className="text-[10px] bg-green-600 text-white px-2.5 py-1 rounded shadow-sm hover:bg-green-700 transition-colors font-medium flex items-center gap-1 active:transform active:scale-95"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Apply Fix
                    </button>
                 )}
              </div>
              <pre className="bg-green-50 border border-green-200 rounded-md p-3 text-xs font-mono text-green-900 overflow-x-auto shadow-inner mt-2">
                <code>{issue.replacementCode}</code>
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};