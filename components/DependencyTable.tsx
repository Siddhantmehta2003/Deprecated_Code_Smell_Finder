import React from 'react';
import { DependencyAudit } from '../types';

interface DependencyTableProps {
  dependencies: DependencyAudit[];
}

export const DependencyTable: React.FC<DependencyTableProps> = ({ dependencies }) => {
  if (!dependencies || dependencies.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm mb-6 animate-in fade-in slide-in-from-bottom-2">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex justify-between items-center">
        <div>
          <h4 className="font-semibold text-slate-900 dark:text-slate-100">Package Compatibility & Upgrades</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Automated dependency analysis</p>
        </div>
        <span className="text-xs font-mono bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600">
          {dependencies.length} Detected
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-6 py-3 whitespace-nowrap">Package Name</th>
              <th className="px-6 py-3 whitespace-nowrap">Current</th>
              <th className="px-6 py-3 whitespace-nowrap">Latest</th>
              <th className="px-6 py-3 whitespace-nowrap">Status</th>
              <th className="px-6 py-3 w-full">Action Required</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {dependencies.map((dep, idx) => (
              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <td className="px-6 py-3 font-mono font-medium text-slate-900 dark:text-slate-200">{dep.packageName}</td>
                <td className="px-6 py-3 font-mono text-slate-600 dark:text-slate-400">{dep.currentVersion}</td>
                <td className="px-6 py-3 font-mono text-slate-600 dark:text-slate-400">{dep.latestVersion}</td>
                <td className="px-6 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    dep.compatibilityStatus === 'Compatible' 
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' 
                      : dep.compatibilityStatus === 'Breaking Changes' 
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' 
                        : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                  }`}>
                    {dep.compatibilityStatus}
                  </span>
                </td>
                <td className="px-6 py-3 text-slate-600 dark:text-slate-400 italic">
                  {dep.actionRequired}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};