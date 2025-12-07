import React, { useState } from 'react';
import { analyzeCode } from './services/geminiService';
import { AnalysisReport, Severity } from './types';
import { Button } from './components/Button';
import { CodeEditor } from './components/CodeEditor';
import { IssueCard } from './components/IssueCard';
import { TimelineChart } from './components/TimelineChart';

const App: React.FC = () => {
  const [code, setCode] = useState<string>('');
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!code.trim()) {
      setError("Please enter some code to analyze.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await analyzeCode(code);
      setReport(result);
    } catch (err: any) {
      setError(err.message || "Failed to analyze code. Please check your API key and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCode(text);
      setError(null);
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold">D</div>
            <h1 className="font-bold text-xl tracking-tight">DeprecCheck AI</h1>
          </div>
          <div className="text-sm text-slate-500 hidden md:block">
            Powered by Gemini 2.5 Flash
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8">
        
        {/* Hero / Input Section */}
        <section className="mb-12">
          <div className="max-w-2xl mx-auto text-center mb-8">
            <h2 className="text-3xl font-bold mb-3 text-slate-900">Future-Proof Your Codebase</h2>
            <p className="text-slate-600 text-lg">
              Scan for deprecated libraries and upcoming breaking changes. 
              Get a 6-12 month warning before your code breaks.
            </p>
          </div>

          <div className="grid gap-6">
            <div className="flex flex-col gap-4">
              <CodeEditor 
                value={code} 
                onChange={setCode} 
                placeholder="// Paste your code here (e.g., package.json, React component, Python script)..." 
              />
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <label htmlFor="file-upload" className="cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-100 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload File
                  </label>
                  <input 
                    id="file-upload" 
                    type="file" 
                    className="hidden" 
                    accept=".js,.jsx,.ts,.tsx,.py,.json,.go,.rs,.java"
                    onChange={handleFileUpload}
                  />
                  {code.length > 0 && (
                     <span className="text-xs text-slate-400">{code.length} chars</span>
                  )}
                </div>

                <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setCode('')}>Clear</Button>
                    <Button onClick={handleAnalyze} isLoading={loading} disabled={!code.trim()}>
                        Analyze Code
                    </Button>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center gap-2 text-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}
          </div>
        </section>

        {/* Results Dashboard */}
        {report && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-slate-900">Analysis Report</h3>
                <div className="text-sm text-slate-500">
                    Scanned at {new Date(report.timestamp).toLocaleTimeString()}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Health Score */}
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
                    <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Health Score</h4>
                    <div className="flex items-end gap-2 mt-2">
                        <span className={`text-5xl font-bold ${
                            report.overallHealthScore > 80 ? 'text-green-500' :
                            report.overallHealthScore > 50 ? 'text-amber-500' : 'text-red-500'
                        }`}>
                            {report.overallHealthScore}
                        </span>
                        <span className="text-slate-400 mb-1">/ 100</span>
                    </div>
                </div>

                {/* Summary */}
                <div className="md:col-span-2 bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                    <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Executive Summary</h4>
                    <p className="text-slate-700 leading-relaxed">{report.summary}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Col: Chart + Stats */}
                <div className="lg:col-span-1 space-y-6">
                    <TimelineChart issues={report.issues} />
                    
                    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                        <h4 className="text-sm font-semibold text-slate-900 mb-4">Issue Breakdown</h4>
                        <div className="space-y-3">
                            {(['Critical', 'Warning', 'Info'] as Severity[]).map(sev => {
                                const count = report.issues.filter(i => i.severity === sev).length;
                                return (
                                    <div key={sev} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${
                                                sev === 'Critical' ? 'bg-red-500' :
                                                sev === 'Warning' ? 'bg-amber-500' : 'bg-blue-500'
                                            }`} />
                                            <span className="text-slate-600">{sev}</span>
                                        </div>
                                        <span className="font-medium text-slate-900">{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Col: Issue List */}
                <div className="lg:col-span-2 space-y-4">
                     <h4 className="text-lg font-bold text-slate-900 mb-2">Detailed Findings</h4>
                     {report.issues.length === 0 ? (
                         <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center text-green-800">
                             <h4 className="font-bold text-lg mb-2">No Issues Found!</h4>
                             <p>Your code appears to be free of major deprecation risks based on our current knowledge base.</p>
                         </div>
                     ) : (
                         report.issues.map(issue => (
                             <IssueCard key={issue.id} issue={issue} />
                         ))
                     )}
                </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default App;
