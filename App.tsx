import React, { useState, useRef } from 'react';
import { analyzeCode } from './services/geminiService';
import { AnalysisReport, Severity, Issue } from './types';
import { Button } from './components/Button';
import { CodeEditor, CodeEditorHandle } from './components/CodeEditor';
import { IssueCard } from './components/IssueCard';
import { TimelineChart } from './components/TimelineChart';
import { DependencyTable } from './components/DependencyTable';
import { ApiDebugger } from './components/ApiDebugger';
import { DiffViewer } from './components/DiffViewer';

type Tab = 'scanner' | 'debugger';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('scanner');
  const [code, setCode] = useState<string>('');
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [previewIssue, setPreviewIssue] = useState<Issue | null>(null);
  
  // Ref to control the editor programmatically
  const editorRef = useRef<CodeEditorHandle>(null);

  const handleAnalyze = async () => {
    if (!code.trim()) {
      setError("Please enter some code to analyze.");
      return;
    }

    setLoading(true);
    setError(null);
    setPreviewIssue(null);
    try {
      const result = await analyzeCode(code);
      setReport(result);
    } catch (err: any) {
      setError(err.message || "Failed to analyze code.");
    } finally {
      setLoading(false);
    }
  };

  const handleLocateCode = (issue: Issue) => {
    // 1. Set the issue to preview (shows the diff viewer)
    setPreviewIssue(issue);
    
    // 2. Highlight in main editor
    editorRef.current?.highlight(issue.affectedCode);
    
    // 3. Smooth scroll to editor to show context
    const editorElement = document.getElementById('main-editor');
    if (editorElement) {
        editorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleApplyFix = (issue: Issue) => {
    const { affectedCode, replacementCode } = issue;
    
    if (code.includes(affectedCode)) {
      // Apply the fix
      setCode(prev => prev.replace(affectedCode, replacementCode));
      
      // Update preview to reflect this specific change logic if needed, 
      // but usually we clear it or show the next one. 
      // Let's keep the preview active but update it so the user sees the "After" state is now the "Current" state?
      // Actually, standard behavior: Highlight the NEW code in the editor.
      
      setTimeout(() => {
        editorRef.current?.highlight(replacementCode);
        // We can close the preview since the diff is now resolved in the code
        setPreviewIssue(null); 
      }, 50);
      
    } else {
      alert("Could not automatically locate the exact code snippet. It may have already been changed.");
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
      setPreviewIssue(null);
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">D</div>
            <h1 className="font-bold text-xl tracking-tight text-slate-900">DeprecCheck AI</h1>
          </div>
          
          <nav className="flex gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
             <button 
               onClick={() => setActiveTab('scanner')}
               className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'scanner' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
             >
               Code Scanner
             </button>
             <button 
               onClick={() => setActiveTab('debugger')}
               className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'debugger' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
             >
               API Debugger
             </button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8">
        
        {activeTab === 'debugger' ? (
          <ApiDebugger />
        ) : (
          <>
            {/* Hero / Input Section */}
            <section className="mb-12">
              <div className="max-w-2xl mx-auto text-center mb-8">
                <h2 className="text-3xl font-bold mb-3 text-slate-900 tracking-tight">Future-Proof Your Codebase</h2>
                <p className="text-slate-600 text-lg">
                  Scan for deprecated libraries, breaking changes, and manage package upgrades efficiently.
                </p>
              </div>

              <div className="grid gap-6">
                <div className="flex flex-col gap-2" id="main-editor">
                  <CodeEditor 
                    ref={editorRef}
                    value={code} 
                    onChange={setCode} 
                    placeholder="// Paste your code, package.json, or requirements.txt here..." 
                  />
                  
                  {/* GitHub Style Diff Viewer */}
                  {previewIssue && (
                    <DiffViewer 
                      isVisible={!!previewIssue}
                      oldCode={previewIssue.affectedCode}
                      newCode={previewIssue.replacementCode}
                      context={previewIssue.description}
                    />
                  )}
                  
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center gap-2">
                      <label htmlFor="file-upload" className="cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Upload Manifest
                      </label>
                      <input 
                        id="file-upload" 
                        type="file" 
                        className="hidden" 
                        accept=".js,.jsx,.ts,.tsx,.py,.json,.go,.rs,.java,.txt"
                        onChange={handleFileUpload}
                      />
                      {code.length > 0 && (
                        <span className="text-xs text-slate-400 font-mono ml-2">{code.length} chars</span>
                      )}
                    </div>

                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => { setCode(''); setReport(null); setError(null); setPreviewIssue(null); }}>Clear</Button>
                        <Button onClick={handleAnalyze} isLoading={loading} disabled={!code.trim()}>
                            Analyze Code
                        </Button>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-4 rounded-lg flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <div className="bg-red-100 p-1.5 rounded-full flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Analysis Failed</h4>
                      <p className="text-sm mt-1 opacity-90">{error}</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Results Dashboard */}
            {report && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Analysis Report</h3>
                    <div className="text-xs font-mono text-slate-400 bg-white border border-slate-200 px-2 py-1 rounded">
                        {new Date(report.timestamp).toLocaleString()}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Health Score */}
                    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Health</h4>
                        <div className="flex items-end gap-2 mt-2">
                            <span className={`text-6xl font-black tracking-tighter ${
                                report.overallHealthScore > 80 ? 'text-green-500' :
                                report.overallHealthScore > 50 ? 'text-amber-500' : 'text-red-500'
                            }`}>
                                {report.overallHealthScore}
                            </span>
                            <span className="text-slate-400 font-medium mb-2 text-lg">/ 100</span>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="md:col-span-2 bg-white p-6 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Executive Summary</h4>
                        <p className="text-slate-700 leading-relaxed text-sm md:text-base">{report.summary}</p>
                    </div>
                </div>
                
                {/* Dependency Table */}
                {report.dependencies && report.dependencies.length > 0 && (
                   <DependencyTable dependencies={report.dependencies} />
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Col: Chart + Stats */}
                    <div className="lg:col-span-1 space-y-6">
                        <TimelineChart issues={report.issues} />
                        
                        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                            <h4 className="text-sm font-bold text-slate-900 mb-4">Issues by Severity</h4>
                            <div className="space-y-3">
                                {(['Critical', 'Warning', 'Info'] as Severity[]).map(sev => {
                                    const count = report.issues.filter(i => i.severity === sev).length;
                                    return (
                                        <div key={sev} className="flex items-center justify-between text-sm group">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm ${
                                                    sev === 'Critical' ? 'bg-red-500' :
                                                    sev === 'Warning' ? 'bg-amber-500' : 'bg-blue-500'
                                                }`} />
                                                <span className="text-slate-600 font-medium">{sev}</span>
                                            </div>
                                            <span className="font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded group-hover:bg-slate-100 transition-colors">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right Col: Issue List */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex justify-between items-end mb-2">
                           <h4 className="text-lg font-bold text-slate-900">Detailed Findings</h4>
                           <span className="text-xs text-slate-500">{report.issues.length} items found</span>
                        </div>
                        {report.issues.length === 0 ? (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center text-green-800">
                                <h4 className="font-bold text-lg mb-2">No Issues Found!</h4>
                                <p>Your code appears to be free of major deprecation risks based on our current knowledge base.</p>
                            </div>
                        ) : (
                            report.issues.map(issue => (
                                <IssueCard 
                                  key={issue.id} 
                                  issue={issue} 
                                  onApplyFix={handleApplyFix}
                                  onLocate={handleLocateCode}
                                />
                            ))
                        )}
                    </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default App;