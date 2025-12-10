import React, { useState, useRef, useMemo } from 'react';
import { analyzeCode } from './services/geminiService';
import { scanGitRepo, scanLocalPath } from './services/backendService';
import { AnalysisReport, Severity, Issue, PrStatus } from './types';
import { Button } from './components/Button';
import { CodeEditor, CodeEditorHandle } from './components/CodeEditor';
import { IssueCard } from './components/IssueCard';
import { TimelineChart } from './components/TimelineChart';
import { DependencyTable } from './components/DependencyTable';
import { ApiDebugger } from './components/ApiDebugger';
import { DiffViewer } from './components/DiffViewer';
import { PrDashboard } from './components/PrDashboard';

type Tab = 'scanner' | 'pr-interceptor' | 'debugger';
type InputMode = 'manual' | 'git' | 'local';

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
  const [inputMode, setInputMode] = useState<InputMode>('manual');
  
  // Input states
  const [code, setCode] = useState<string>('');
  const [repoUrl, setRepoUrl] = useState('');
  const [localPath, setLocalPath] = useState('');
  
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [previewIssue, setPreviewIssue] = useState<Issue | null>(null);
  
  // PR Interceptor State
  const [prStatus, setPrStatus] = useState<PrStatus>('idle');
  
  // State for side-by-side fix review
  const [fixReview, setFixReview] = useState<FixReviewState | null>(null);
  
  // State for temporary highlights (e.g., after Locate or Fix)
  const [highlightedText, setHighlightedText] = useState<string | null>(null);
  const [highlightColor, setHighlightColor] = useState<'red' | 'green'>('red');
  
  // State for Dependency Dropdown in Navbar
  const [showDeps, setShowDeps] = useState(false);

  // Ref to control the editor programmatically
  const editorRef = useRef<CodeEditorHandle>(null);

  // Calculate Dependency Stats for Navbar
  const depStats = useMemo(() => {
    if (!report?.dependencies || report.dependencies.length === 0) return null;
    const total = report.dependencies.length;
    const breaking = report.dependencies.filter(d => d.compatibilityStatus === 'Breaking Changes').length;
    const compatible = report.dependencies.filter(d => d.compatibilityStatus === 'Compatible').length;
    return { total, breaking, compatible };
  }, [report]);

  const handleAnalyze = async (codeOverride?: string, isPrCheck: boolean = false) => {
    const textToAnalyze = codeOverride || code;
    
    if (!textToAnalyze.trim()) {
      setError("Please enter some code to analyze.");
      return;
    }

    setLoading(true);
    setError(null);
    setPreviewIssue(null);
    setHighlightedText(null);
    if (isPrCheck) setPrStatus('checking');
    
    try {
      const result = await analyzeCode(textToAnalyze);
      setReport(result);
      
      if (isPrCheck) {
          // Determine PR Status based on findings
          if (result.issues.length > 0) {
              setPrStatus('blocked');
          } else {
              setPrStatus('passed');
          }
      }
    } catch (err: any) {
      setError(err.message || "Failed to analyze code.");
      if (isPrCheck) setPrStatus('idle');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadRepo = async (isPrCheck: boolean = false) => {
    if (!repoUrl) return;
    setLoading(true);
    setError(null);
    if (isPrCheck) setPrStatus('checking');

    try {
        const result = await scanGitRepo(repoUrl);
        setCode(result.context);
        setInputMode('manual'); // Switch to editor view to show loaded code
        
        // Auto-analyze
        const analysis = await analyzeCode(result.context);
        setReport(analysis);
        
        if (isPrCheck) {
            setPrStatus(analysis.issues.length > 0 ? 'blocked' : 'passed');
        }

    } catch (err: any) {
        setError(err.message);
        setPrStatus('idle');
    } finally {
        setLoading(false);
    }
  };

  const handleLoadLocal = async (isPrCheck: boolean = false) => {
    if (!localPath) return;
    setLoading(true);
    setError(null);
    if (isPrCheck) setPrStatus('checking');

    try {
        const result = await scanLocalPath(localPath);
        setCode(result.context);
        setInputMode('manual'); // Switch to editor view
        
        // Auto-analyze
        const analysis = await analyzeCode(result.context);
        setReport(analysis);
        
        if (isPrCheck) {
             setPrStatus(analysis.issues.length > 0 ? 'blocked' : 'passed');
        }
    } catch (err: any) {
        setError(err.message);
        setPrStatus('idle');
    } finally {
        setLoading(false);
    }
  };

  const handleLocateCode = (issue: Issue) => {
    // Cannot locate if in review mode (split screen)
    if (fixReview) return;
    
    // 1. Show DiffViewer
    setPreviewIssue(issue);
    
    // 2. Highlight text in Editor (Red for 'problem')
    setHighlightedText(issue.affectedCode);
    setHighlightColor('red');
    
    // 3. Scroll to it
    editorRef.current?.highlight(issue.affectedCode);
    
    const editorElement = document.getElementById('main-editor');
    if (editorElement) {
        editorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleApplyFix = (issue: Issue) => {
    const { affectedCode, replacementCode } = issue;
    
    // Attempt robust find
    let match = affectedCode;
    // Basic trimming check
    if (!code.includes(match) && code.includes(match.trim())) {
        match = match.trim();
    }

    if (code.includes(match)) {
      const newCode = code.replace(match, replacementCode);
      
      // Update code
      setCode(newCode);
      
      // Hide the DiffViewer as it is now fixed
      setPreviewIssue(null);
      
      // Set highlight to Green to show success on the NEW code
      setHighlightedText(replacementCode);
      setHighlightColor('green');
      
      // Use setTimeout to ensure the render cycle completes with new code before we try to highlight/scroll
      setTimeout(() => {
          editorRef.current?.highlight(replacementCode);
      }, 50);

      // Auto analyze the new code
      handleAnalyze(newCode);

    } else {
      alert("Could not automatically locate the exact code snippet (formatting might differ). It may have already been changed.");
    }
  };

  const handleExitComparison = () => {
    setFixReview(null);
    setHighlightedText(null);
  };

  const handleFixAll = () => {
    if (!report || report.issues.length === 0) return;

    const originalCode = code;
    let updatedCode = code;
    let appliedCount = 0;
    const originalHighlights: string[] = [];
    const modifiedHighlights: string[] = [];

    // Sort issues by affectedCode length (descending) to avoid partial replacements of overlapping issues
    const sortedIssues = [...report.issues].sort((a, b) => b.affectedCode.length - a.affectedCode.length);

    sortedIssues.forEach(issue => {
      let match = issue.affectedCode;
      
      // Robust matching: Try exact, then trimmed
      if (!updatedCode.includes(match)) {
         if (updatedCode.includes(match.trim())) {
             match = match.trim();
         } else {
             return; // Skip if not found
         }
      }

      // GLOBAL REPLACE: We want to fix ALL instances.
      // We use split/join as a simple "replaceAll" that handles special regex chars in code safely
      const parts = updatedCode.split(match);
      if (parts.length > 1) {
         updatedCode = parts.join(issue.replacementCode);
         
         // Track for highlighting
         originalHighlights.push(match);
         modifiedHighlights.push(issue.replacementCode);
         appliedCount += (parts.length - 1);
      }
    });

    if (appliedCount === 0) {
       alert("No applicable fixes found automatically (code might have changed or formatting differs).");
       return;
    }

    // Set Split View State
    setFixReview({
      original: originalCode,
      modified: updatedCode,
      originalHighlights,
      modifiedHighlights,
      isBulkFix: true
    });

    // Update main code
    setCode(updatedCode);
    
    // If in PR mode, update status
    if (activeTab === 'pr-interceptor') {
        setPrStatus('passed');
    }

    // TRIGGER RE-ANALYSIS on the NEW code to update the score
    handleAnalyze(updatedCode);
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
      setHighlightedText(null);
      setInputMode('manual');
    };
    reader.readAsText(file);
  };

  const predictionCount = report?.issues.filter(i => i.isPrediction).length || 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">D</div>
            <h1 className="font-bold text-xl tracking-tight text-slate-900">DeprecCheck AI</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Dependency Status Widget (In Navbar) */}
            {depStats && (
                <div className="relative">
                    <button 
                       onClick={() => setShowDeps(!showDeps)}
                       className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                           depStats.breaking > 0 
                           ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' 
                           : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                       }`}
                       title="Click to view dependency details"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <span>{depStats.breaking > 0 ? `${depStats.breaking} Breaking Changes` : 'Libraries Compatible'}</span>
                        <span className="bg-white px-1.5 py-0.5 rounded-full border border-current opacity-60 text-[10px]">{depStats.total}</span>
                    </button>

                    {showDeps && (
                        <>
                          <div className="fixed inset-0 z-40 cursor-default" onClick={() => setShowDeps(false)}></div>
                          <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 origin-top-right z-50">
                              <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                  <h4 className="font-bold text-slate-800 text-sm">Dependency Audit</h4>
                                  <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                    Live Status
                                  </span>
                              </div>
                              <div className="max-h-[350px] overflow-y-auto">
                                  {report?.dependencies?.map((dep, i) => (
                                      <div key={i} className="p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                          <div className="flex justify-between mb-1">
                                              <span className="font-semibold text-slate-900 text-sm">{dep.packageName}</span>
                                              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                                  dep.compatibilityStatus === 'Compatible' ? 'bg-green-100 text-green-700 border-green-200' :
                                                  dep.compatibilityStatus === 'Breaking Changes' ? 'bg-red-100 text-red-700 border-red-200' :
                                                  'bg-amber-100 text-amber-700 border-amber-200'
                                              }`}>
                                                  {dep.compatibilityStatus}
                                              </span>
                                          </div>
                                          <div className="flex justify-between text-xs text-slate-500 font-mono">
                                              <span>v{dep.currentVersion} → v{dep.latestVersion}</span>
                                          </div>
                                          {dep.actionRequired && (
                                              <p className="text-[10px] text-slate-600 mt-1 italic">"{dep.actionRequired}"</p>
                                          )}
                                      </div>
                                  ))}
                              </div>
                          </div>
                        </>
                    )}
                </div>
            )}

            {/* Nav Tabs */}
            <nav className="flex gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
               <button 
                 onClick={() => setActiveTab('scanner')}
                 className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'scanner' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
               >
                 Scanner
               </button>
               <button 
                 onClick={() => setActiveTab('pr-interceptor')}
                 className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'pr-interceptor' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
               >
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                 PR Interceptor
               </button>
               <button 
                 onClick={() => setActiveTab('debugger')}
                 className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'debugger' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
               >
                 Debugger
               </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8">
        
        {activeTab === 'debugger' ? (
          <ApiDebugger />
        ) : activeTab === 'pr-interceptor' ? (
          /* ================= PR INTERCEPTOR TAB ================= */
          <div className="animate-in fade-in duration-500">
            <div className="text-center mb-8">
               <h2 className="text-3xl font-bold text-slate-900 mb-2">AI Pull Request Interceptor</h2>
               <p className="text-slate-600">Acts as a firewall, blocking PRs that add deprecated or risky code.</p>
            </div>

            {/* Config Section */}
            {prStatus === 'idle' && !report && (
                 <div className="max-w-xl mx-auto bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex flex-col gap-4">
                        <label className="text-sm font-bold text-slate-700">Repository or Path to Intercept</label>
                        <div className="flex gap-2">
                             <input 
                                type="text" 
                                placeholder="https://github.com/user/repo" 
                                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                                value={repoUrl}
                                onChange={(e) => setRepoUrl(e.target.value)}
                              />
                             <Button onClick={() => handleLoadRepo(true)} isLoading={loading} className="bg-slate-900">
                                Check PR
                             </Button>
                        </div>
                        <div className="text-center text-xs text-slate-400 font-medium">OR</div>
                         <div className="flex gap-2">
                             <input 
                                type="text" 
                                placeholder="/local/path/to/project" 
                                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                                value={localPath}
                                onChange={(e) => setLocalPath(e.target.value)}
                              />
                             <Button onClick={() => handleLoadLocal(true)} isLoading={loading} variant="secondary">
                                Scan Local
                             </Button>
                        </div>
                    </div>
                 </div>
            )}

            {/* Dashboard */}
            <PrDashboard 
               status={prStatus} 
               report={report} 
               onBlock={() => alert('PR Blocked. Notification sent to author.')}
               onAllow={() => { setPrStatus('passed'); alert('PR Allowed forcefully.'); }}
               onFixAll={handleFixAll}
            />
            
            {/* If Fix All triggered in PR mode, show the split editor comparison below */}
            {fixReview && (
               <div className="mt-8 animate-in slide-in-from-bottom-4">
                  <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-lg text-slate-900">Migration Preview</h3>
                      <div className="flex gap-2">
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">
                             Auto-Fix Applied
                          </span>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 h-[500px]">
                      <div className="flex flex-col rounded-lg overflow-hidden border border-red-200 shadow-sm bg-slate-950">
                          <CodeEditor 
                              value={fixReview.original} 
                              onChange={() => {}} 
                              readOnly={true} 
                              className="h-full border-none"
                              highlights={fixReview.originalHighlights}
                              highlightColor="red"
                          />
                      </div>
                      <div className="flex flex-col rounded-lg overflow-hidden border border-green-200 shadow-sm bg-slate-950">
                          <CodeEditor 
                              value={code} 
                              onChange={setCode} 
                              className="h-full border-none"
                              highlights={fixReview.modifiedHighlights}
                              highlightColor="green"
                          />
                      </div>
                  </div>
                  
                  {report && (
                      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                           <div>
                               <h4 className="font-bold text-green-900">Health Score Updated</h4>
                               <p className="text-sm text-green-700">New analysis confirms fixes are valid.</p>
                           </div>
                           <div className="text-4xl font-black text-green-600">
                               {report.overallHealthScore}/100
                           </div>
                      </div>
                  )}
               </div>
            )}
          </div>
        ) : (
          /* ================= SCANNER TAB (Existing Logic) ================= */
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
                
                {/* Input Mode Tabs */}
                {!fixReview && (
                    <div className="flex border-b border-slate-200 w-full mb-2">
                        <button 
                            onClick={() => setInputMode('manual')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${inputMode === 'manual' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            Manual / Editor
                        </button>
                        <button 
                            onClick={() => setInputMode('git')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${inputMode === 'git' ? 'border-violet-500 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                            Git Repository
                        </button>
                        <button 
                            onClick={() => setInputMode('local')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${inputMode === 'local' ? 'border-blue-500 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            Local Path
                        </button>
                    </div>
                )}

                <div className="flex flex-col gap-2" id="main-editor">
                  
                  {inputMode === 'git' && !fixReview ? (
                      <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm text-center space-y-4 animate-in fade-in zoom-in-95">
                          <div className="mx-auto w-12 h-12 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center">
                              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                          </div>
                          <h3 className="text-lg font-bold text-slate-900">Scan Public Repository</h3>
                          <p className="text-slate-500 text-sm max-w-md mx-auto">
                              Enter a GitHub/GitLab URL. We will clone it to a secure sandbox, filter for source code and dependency files, and analyze it.
                          </p>
                          <div className="flex gap-2 max-w-lg mx-auto">
                              <input 
                                type="text" 
                                placeholder="https://github.com/username/repo" 
                                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                                value={repoUrl}
                                onChange={(e) => setRepoUrl(e.target.value)}
                              />
                              <Button onClick={() => handleLoadRepo(false)} isLoading={loading} className="bg-violet-600 hover:bg-violet-700">
                                  Load Repo
                              </Button>
                          </div>
                      </div>
                  ) : inputMode === 'local' && !fixReview ? (
                      <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm text-center space-y-4 animate-in fade-in zoom-in-95">
                          <div className="mx-auto w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          </div>
                          <h3 className="text-lg font-bold text-slate-900">Scan Local Path</h3>
                          <p className="text-slate-500 text-sm max-w-md mx-auto">
                              Enter the absolute path to your local project directory. <br/>
                              <span className="text-xs text-amber-600 bg-amber-50 px-1 py-0.5 rounded mt-1 inline-block">Requires backend running locally</span>
                          </p>
                          <div className="flex gap-2 max-w-lg mx-auto">
                              <input 
                                type="text" 
                                placeholder="/Users/dev/projects/my-app" 
                                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                value={localPath}
                                onChange={(e) => setLocalPath(e.target.value)}
                              />
                              <Button onClick={() => handleLoadLocal(false)} isLoading={loading} className="bg-blue-600 hover:bg-blue-700">
                                  Load Files
                              </Button>
                          </div>
                      </div>
                  ) : fixReview ? (
                    /* Split View Comparison Mode (Bulk Fix) */
                    <div className="animate-in fade-in duration-300">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-100 text-violet-600 text-[10px]">⚡</span>
                                Bulk Fix Review
                            </h3>
                            <Button variant="secondary" onClick={handleExitComparison} className="text-xs h-8">
                                Exit Review
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 h-96">
                            {/* Left: Original */}
                            <div className="flex flex-col rounded-lg overflow-hidden border border-red-200 shadow-sm bg-slate-950">
                                <CodeEditor 
                                    value={fixReview.original} 
                                    onChange={() => {}} 
                                    readOnly={true} 
                                    className="h-full border-none"
                                    highlights={fixReview.originalHighlights}
                                    highlightColor="red"
                                />
                            </div>

                            {/* Right: Modified (Current Code) */}
                            <div className="flex flex-col rounded-lg overflow-hidden border border-green-200 shadow-sm bg-slate-950">
                                <CodeEditor 
                                    value={code} 
                                    onChange={setCode} 
                                    className="h-full border-none"
                                    highlights={fixReview.modifiedHighlights}
                                    highlightColor="green"
                                />
                            </div>
                        </div>
                    </div>
                  ) : (
                    /* Standard Single Editor Mode */
                    <CodeEditor 
                        ref={editorRef}
                        value={code} 
                        onChange={setCode} 
                        placeholder={inputMode === 'manual' 
                          ? "// Paste your code, package.json, or requirements.txt here... \n// Example: \n// import { componentWillReceiveProps } from 'react';"
                          : "// Content will appear here after loading repository..."
                        }
                        className="h-80"
                        highlights={highlightedText ? [highlightedText] : []}
                        highlightColor={highlightColor}
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
                  
                  {/* Action Bar */}
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
                        <Button variant="ghost" onClick={() => { setCode(''); setReport(null); setError(null); setPreviewIssue(null); setFixReview(null); setHighlightedText(null); setInputMode('manual'); }}>Clear</Button>
                        
                        {!fixReview && inputMode === 'manual' && (
                            <Button onClick={() => handleAnalyze()} isLoading={loading} disabled={!code.trim()}>
                                Analyze Code
                            </Button>
                        )}

                        {/* If in Git/Local mode, show Analyze button only if code is loaded */}
                        {!fixReview && (inputMode === 'git' || inputMode === 'local') && code.length > 0 && (
                             <Button onClick={() => handleAnalyze()} isLoading={loading}>
                                Analyze Loaded Repo
                            </Button>
                        )}
                        
                        {fixReview && loading && (
                             <span className="flex items-center gap-2 text-sm text-slate-500">
                                 <svg className="animate-spin h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                 </svg>
                                 Re-analyzing...
                             </span>
                        )}
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
                      <h4 className="font-bold text-sm">Operation Failed</h4>
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
                        {/* Only show Fix All if there are issues AND we are not already in review mode */}
                        {report.issues.length > 0 && !fixReview && (
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
                        {fixReview && (
                           <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-100 text-green-700 text-sm font-semibold border border-green-200">
                               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                               </svg>
                               Latest Fixes Applied
                           </span>
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
