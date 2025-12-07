import React, { useState } from 'react';
import { Issue, Severity } from '../types';

interface IssueCardProps {
  issue: Issue;
}

export const IssueCard: React.FC<IssueCardProps> = ({ issue }) => {
  const [expanded, setExpanded] = useState(false);

  const severityColors = {
    [Severity.CRITICAL]: 'border-l-red-500 text-red-700 bg-red-50',
    [Severity.WARNING]: 'border-l-amber-500 text-amber-700 bg-amber-50',
    [Severity.INFO]: 'border-l-blue-500 text-blue-700 bg-blue-50',
  };

  const badgeColors = {
    [Severity.CRITICAL]: 'bg-red-100 text-red-800',
    [Severity.WARNING]: 'bg-amber-100 text-amber-800',
    [Severity.INFO]: 'bg-blue-100 text-blue-800',
  };

  return (
    <div className={`border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
      <div 
        className={`p-4 cursor-pointer border-l-4 ${severityColors[issue.severity]} flex justify-between items-start`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${badgeColors[issue.severity]}`}>
              {issue.severity}
            </span>
            <span className="text-xs text-slate-500 font-medium border border-slate-200 px-2 py-0.5 rounded">
              {issue.category}
            </span>
            <span className="text-xs text-slate-400">
              EOL: {issue.estimatedEndOfLife}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-slate-900">{issue.title}</h3>
          <p className="text-sm text-slate-600 mt-1 line-clamp-1">{issue.description}</p>
        </div>
        <div className="ml-4 text-slate-400">
          <svg 
            className={`w-5 h-5 transform transition-transform ${expanded ? 'rotate-180' : ''}`} 
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Description</h4>
            <p className="text-sm text-slate-700 leading-relaxed">{issue.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-red-500 uppercase tracking-wider">Problematic Code</h4>
              <pre className="bg-red-50 border border-red-100 rounded p-3 text-xs font-mono text-red-900 overflow-x-auto">
                <code>{issue.affectedCode}</code>
              </pre>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-green-600 uppercase tracking-wider">Suggested Fix</h4>
              <pre className="bg-green-50 border border-green-100 rounded p-3 text-xs font-mono text-green-900 overflow-x-auto">
                <code>{issue.replacementCode}</code>
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
