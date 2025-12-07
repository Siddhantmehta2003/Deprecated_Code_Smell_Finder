import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Issue } from '../types';

interface TimelineChartProps {
  issues: Issue[];
}

export const TimelineChart: React.FC<TimelineChartProps> = ({ issues }) => {
  // Process data to group by EOL year/quarter
  const data = React.useMemo(() => {
    const sortedIssues = [...issues].filter(i => i.estimatedEndOfLife !== 'Unknown');
    const timelineMap = new Map<string, number>();

    // Seed next 12 months
    const today = new Date();
    for (let i = 0; i < 12; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const key = d.toISOString().slice(0, 7); // YYYY-MM
        timelineMap.set(key, 0);
    }

    sortedIssues.forEach(issue => {
      const dateStr = issue.estimatedEndOfLife.slice(0, 7); // YYYY-MM
      if (timelineMap.has(dateStr)) {
        timelineMap.set(dateStr, (timelineMap.get(dateStr) || 0) + 1);
      } else {
        // Only add if it falls within reasonable future range or exists
         timelineMap.set(dateStr, (timelineMap.get(dateStr) || 0) + 1);
      }
    });

    return Array.from(timelineMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));
  }, [issues]);

  if (data.length === 0) return (
      <div className="h-64 flex items-center justify-center text-slate-400 border border-slate-200 border-dashed rounded-lg bg-slate-50">
          No timeline data available
      </div>
  );

  return (
    <div className="h-64 w-full bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Projected Breaking Changes (Timeline)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{fontSize: 12}} stroke="#94a3b8" />
          <YAxis allowDecimals={false} stroke="#94a3b8" tick={{fontSize: 12}} />
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Area 
            type="monotone" 
            dataKey="count" 
            stroke="#f43f5e" 
            fillOpacity={1} 
            fill="url(#colorCount)" 
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
