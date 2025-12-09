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

// Define the state for the fix review mode
interface FixReviewState {
  original: string;
  modified: string;
  originalHighlights: string[];
  modifiedHighlights: string[];
  isBulkFix?: boolean;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('scanner');
  const [code, setCode] = useState<string>('');
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [previewIssue, setPreviewIssue] = useState<Issue | null>(null);
  
  // State for side-by-side fix review
  const [fixReview, setFixReview] = useState<FixReviewState | null>(null);
  
  // Ref to control the editor programmatically
  const editorRef = useRef<CodeEditorHandle>(null);

  const handleAnalyze = async (codeOverride?: string) => {
    const textToAnalyze = codeOverride || code;
    
    if (!textToAnalyze.trim()) {
      setError("Please enter some code to analyze.");
      return;
    }

    setLoading(true);
    setError(null);
    setPreviewIssue(null);
    // Don't clear fixReview here if it was passed from confirm, 
    // but usually handleAnalyze is called from main button or confirm fix.
    
    try {
      const result = await analyzeCode(textToAnalyze);
      setReport(result);
    } catch (err: any) {
      setError(err.message || "Failed to analyze code.");
    } finally {
      setLoading(false);
    }
  };

  const handleLocateCode = (issue: Issue) => {
    // Cannot locate if in review mode
    if (fixReview) return;
    
    setPreviewIssue(issue);
    editorRef.current?.highlight(issue.affectedCode);
    const editorElement = document.getElementById('main-editor');
    if (editorElement) {
        editorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleApplyFix = (issue: Issue) => {
    const { affectedCode, replacementCode } = issue;
    if (code.includes(affectedCode)) {
      const newCode = code.replace(affectedCode, replacementCode);
      
      // Enter Review Mode for Single Issue
      setFixReview({
        original: code,
        modified: newCode,
        originalHighlights: [affectedCode],
        modifiedHighlights: [replacementCode],
        isBulkFix: false
      });

      // Scroll to editor to show the change
      setTimeout(() => {
        document.getElementById('main-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      
    } else {
      alert("Could not automatically locate the exact code snippet. It may have already been changed.");
    }
  };

  const handleConfirmFix = async () => {
    if (fixReview) {
      const newCode = fixReview.modified;
      setCode(newCode);
      setFixReview(null);
      setPreviewIssue(null);
      
      // Re-analyze the code after confirming changes
      await handleAnalyze(newCode);
    }
  };

  const handleCancelFix = () => {
    setFixReview(null);
  };

  const handleFixAll = () => {
    if (!report || report.issues.length === 0) return;

    let updatedCode = code;
    let appliedCount = 0;
    const originalHighlights: string[] = [];
    const modifiedHighlights: string[] = [];

    // Sort issues by affectedCode length (descending) to avoid partial replacements of overlapping issues
    const sortedIssues = [...report.issues].sort((a, b) => b.affectedCode.length - a.affectedCode.length);

    sortedIssues.forEach(issue => {
      // Very basic check to ensure we don't double replace if multiple issues target same code
      if (updatedCode.includes(issue.affectedCode)) {
        updatedCode = updatedCode.replace(issue.affectedCode, issue.replacementCode);
        originalHighlights.push(issue.affectedCode);
        modifiedHighlights.push(issue.replacementCode);
        appliedCount++;
      }
    });

    if (appliedCount === 0) {
       alert("No applicable fixes found (code might have changed).");
       return;
    }

    // Enter Review Mode for Bulk Fix
    setFixReview({
      original: code,
      modified: updatedCode,
      originalHighlights,
      modifiedHighlights,
      isBulkFix: true
    });
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      setFixReview(null);
    };
    reader.readAsText(file);
  };

  const predictionCount = report?.issues.filter(i => i.isPrediction).length || 0;

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
                <div className="mt-4 flex justify-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold border border-violet-200 shadow-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                    </span>
                    Future Prediction Engine Active
                  </span>
                </div>
              </div>

              <div className="grid gap-6">
                <div className="flex flex-col gap-2" id="main-editor">
                  
                  {fixReview ? (
                    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-4 border border-violet-200 rounded-xl p-5 bg-white shadow-lg shadow-violet-100/50 ring-4 ring-violet-50/50">
                        {/* Header for Review Mode */}
                        <div className="flex items-center justify-between border-b border-violet-100 pb-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 text-violet-600 text-xs">⚡</span>
                                    {fixReview.isBulkFix ? 'Review All Changes' : 'Review Fix Application'}
                                </h3>
                                <p className="text-slate-500 text-sm mt-1">
                                    Compare the <span className="font-semibold text-red-600">Original</span> code vs. <span className="font-semibold text-green-600">Updated</span> version.
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                 <Button variant="ghost" onClick={handleCancelFix} className="border border-slate-200">Cancel</Button>
                                 <Button variant="primary" onClick={handleConfirmFix} className="bg-violet-600 hover:bg-violet-700 shadow-md shadow-violet-200">
                                   Confirm & Apply {fixReview.isBulkFix ? 'All' : ''} Fixes
                                 </Button>
                            </div>
                        </div>

                        {/* Two Editor Windows */}
                        <div className="grid grid-cols-2 gap-4 h-[500px]">
                            <div className="flex flex-col gap-2 h-full">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-red-600 uppercase tracking-wider bg-red-50 px-2 py-1 rounded border border-red-100 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-red-500"></div> Original
                                    </span>
                                </div>
                                <div className="flex-1 border-2 border-red-100 rounded-lg overflow-hidden ring-offset-2 focus-within:ring-2 ring-red-200/50 shadow-sm">
                                   <CodeEditor 
                                     value={fixReview.original} 
                                     onChange={() => {}} 
                                     readOnly={true} 
                                     className="h-full border-none"
                                     highlights={fixReview.originalHighlights}
                                     highlightColor="red"
                                   />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 h-full">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-green-600 uppercase tracking-wider bg-green-50 px-2 py-1 rounded border border-green-100 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div> After Fix
                                    </span>
                                </div>
                                <div className="flex-1 border-2 border-green-100 rounded-lg overflow-hidden ring-offset-2 focus-within:ring-2 ring-green-200/50 shadow-sm">
                                   <CodeEditor 
                                     value={fixReview.modified} 
                                     onChange={(val) => setFixReview({...fixReview, modified: val})} 
                                     className="h-full border-none"
                                     highlights={fixReview.modifiedHighlights}
                                     highlightColor="green"
                                   />
                                </div>
                            </div>
                        </div>
                    </div>
                  ) : (
                    <CodeEditor 
                      ref={editorRef}
                      value={code} 
                      onChange={setCode} 
                      placeholder="// Paste your code, package.json, or requirements.txt here... \n// Example: \n// import { componentWillReceiveProps } from 'react';\n// var http = require('http');" 
                      className="h-80"
                    />
                  )}
                  
                  {/* Show DiffViewer only if NOT in Review Mode */}
                  {!fixReview && previewIssue && (
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
                        <Button variant="ghost" onClick={() => { setCode(''); setReport(null); setError(null); setPreviewIssue(null); setFixReview(null); }}>Clear</Button>
                        <Button onClick={() => handleAnalyze()} isLoading={loading} disabled={!code.trim() || !!fixReview}>
                            {fixReview ? 'Finish Review First' : 'Analyze Code'}
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Analysis Report</h3>
                        {report.issues.length > 0 && (
                           <button 
                             onClick={handleFixAll}
                             className="group relative inline-flex items-center justify-center gap-2 px-6 py-2.5 font-semibold text-white transition-all duration-300 bg-slate-900 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 overflow-hidden"
                           >
                              <div className="absolute inset-0 transition-opacity duration-300 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-600"></div>
                              <span className="relative flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                Fix All Changes
                              </span>
                           </button>
                        )}
                    </div>
                    <div className="text-xs font-mono text-slate-400 bg-white border border-slate-200 px-2 py-1 rounded self-start md:self-auto">
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
                                    const count = report.issues.filter(i => i.severity === sev && !i.isPrediction).length;
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

                                {/* Future Prediction Stat */}
                                <div className="flex items-center justify-between text-sm group pt-2 mt-2 border-t border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <span className="flex items-center justify-center w-4 h-4 text-xs rounded-full bg-violet-100 text-violet-600">🔮</span>
                                        <span className="text-violet-700 font-semibold">Future Predictions</span>
                                    </div>
                                    <span className="font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded group-hover:bg-violet-100 transition-colors">{predictionCount}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Col: Issue List */}
                    <div className="lg:col-span-2 space-y-8">
                        {report.issues.length === 0 ? (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center text-green-800 animate-in fade-in zoom-in-95">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4 shadow-sm">
                                   <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                   </svg>
                                </div>
                                <h4 className="font-bold text-xl mb-2 text-green-900">All Systems Go!</h4>
                                <p className="text-green-700">Your code is fully optimized, secure, and free of known deprecation risks.</p>
                            </div>
                        ) : (
                            <>
                                {/* Future Predictions Section */}
                                {report.issues.some(i => i.isPrediction) && (
                                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                                        <div className="flex items-center gap-3 mb-4 p-4 bg-gradient-to-r from-violet-50 to-white border border-violet-100 rounded-lg shadow-sm">
                                           <div className="p-2 bg-white rounded-md shadow-sm text-2xl">🔮</div>
                                           <div>
                                              <h4 className="font-bold text-violet-900 leading-tight">Future API Predictions</h4>
                                              <p className="text-xs text-violet-700 opacity-80 mt-0.5">AI-forecasted deprecations (6-12 months) based on trends</p>
                                           </div>
                                        </div>
                                        <div className="space-y-4">
                                            {report.issues.filter(i => i.isPrediction).map(issue => (
                                                <IssueCard 
                                                  key={issue.id} 
                                                  issue={issue} 
                                                  onApplyFix={handleApplyFix}
                                                  onLocate={handleLocateCode}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Standard Issues Section */}
                                {report.issues.some(i => !i.isPrediction) && (
                                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                                        <div className="flex items-center gap-3 mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg shadow-sm">
                                           <div className="p-2 bg-white rounded-md shadow-sm text-2xl">⚠️</div>
                                           <div>
                                              <h4 className="font-bold text-slate-900 leading-tight">Detected Deprecations</h4>
                                              <p className="text-xs text-slate-600 opacity-80 mt-0.5">Immediate fixes required for code health</p>
                                           </div>
                                        </div>
                                        <div className="space-y-4">
                                            {report.issues.filter(i => !i.isPrediction).map(issue => (
                                                <IssueCard 
                                                  key={issue.id} 
                                                  issue={issue} 
                                                  onApplyFix={handleApplyFix}
                                                  onLocate={handleLocateCode}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
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