import React, { useState, useRef, useMemo, useEffect } from 'react';
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
import { ShadowModeEmulator } from './components/ShadowModeEmulator';

type Tab = 'scanner' | 'pr-interceptor' | 'shadow-mode' | 'debugger';
type InputMode = 'manual' | 'git' | 'local';

// Define the state for the fix review mode
interface FixReviewState {
  original: string;
  modified: string;
  originalHighlights: string[];
  modifiedHighlights: string[];
  isBulkFix?: boolean;
}

interface ScannedFile {
  name: string;
  path: string;
  content: string;
  selected: boolean;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('scanner');
  const [inputMode, setInputMode] = useState<InputMode>('manual');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Input states
  const [code, setCode] = useState<string>('');
  const [repoUrl, setRepoUrl] = useState('');
  const [scannedFiles, setScannedFiles] = useState<ScannedFile[]>([]);
  
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
  
  // Ref for directory upload
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Theme Toggle Effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

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
    setScannedFiles([]);
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

  const processSelectedFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setLoading(true);
    setError(null);
    setScannedFiles([]);
    setReport(null);
    setPrStatus('idle');

    try {
      // Filter for code files to avoid binary data
      const validExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.json', '.html', '.css', '.java', '.go', '.rs'];
      const codeFiles = Array.from(files).filter((file: File) => 
        validExtensions.some(ext => file.name.endsWith(ext)) && 
        !file.name.includes('node_modules') &&
        !file.name.includes('.git')
      );

      if (codeFiles.length === 0) {
        throw new Error("No relevant code files found.");
      }

      const filePromises = codeFiles.map((file: File) => {
          return new Promise<ScannedFile>((resolve, reject) => {
              const reader = new FileReader();
              // For individual files, webkitRelativePath might be empty, fallback to name
              const filePath = (file as any).webkitRelativePath || file.name;
              
              reader.onload = (e) => {
                  resolve({
                      name: file.name,
                      path: filePath,
                      content: e.target?.result as string,
                      selected: true // Select all by default
                  });
              };
              reader.onerror = reject;
              reader.readAsText(file);
          });
      });

      const processedFiles = await Promise.all(filePromises);
      setScannedFiles(processedFiles);
      setInputMode('local');

    } catch (err: any) {
      setError(err.message || "Failed to read files");
    } finally {
      setLoading(false);
      if (folderInputRef.current) folderInputRef.current.value = '';
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFolderSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    processSelectedFiles(event.target.files);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
     processSelectedFiles(event.target.files);
  };

  const toggleFileSelection = (index: number) => {
    setScannedFiles(prev => prev.map((f, i) => i === index ? { ...f, selected: !f.selected } : f));
  };

  const toggleAllFiles = (select: boolean) => {
    setScannedFiles(prev => prev.map(f => ({ ...f, selected: select })));
  };

  const runLocalScan = () => {
      const activeFiles = scannedFiles.filter(f => f.selected);
      if (activeFiles.length === 0) {
          setError("Please select at least one file to scan.");
          return;
      }
      
      const combinedContext = activeFiles.map(f => `// File: ${f.path}\n${f.content}`).join('\n');
      setCode(combinedContext);
      handleAnalyze(combinedContext, true); // true = isPrCheck
  };

  const handleLocateCode = (issue: Issue) => {
    // Cannot locate if in review mode (split screen)
    if (fixReview) return;
    
    // 1. Show DiffViewer with the issue
    setPreviewIssue(issue);
    
    // 2. Highlight text in Editor (Red for 'problem')
    setHighlightedText(issue.affectedCode);
    setHighlightColor('red');
    
    // 3. Scroll to it
    // Slight timeout to allow UI state to settle
    setTimeout(() => {
        editorRef.current?.highlight(issue.affectedCode);
        const editorElement = document.getElementById('main-editor');
        if (editorElement) {
            editorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 10);
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

      // Auto analyze the new code to update dependency status in navbar
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
    
    // CRITICAL for PR Interceptor: Only unblock if migration happens
    if (activeTab === 'pr-interceptor') {
        setPrStatus('passed');
    }

    // TRIGGER RE-ANALYSIS on the NEW code to update the score and dependencies in navbar
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

  // Simulated Commit Handler
  const handleCommit = () => {
      // In a real app, this would POST to the backend to git commit & push
      const message = `Refactor: DepreCheck AI Auto-Fix applied ${fixReview ? '(Bulk)' : ''}`;
      
      // Simulate network request
      setLoading(true);
      setTimeout(() => {
          setLoading(false);
          alert(`Success! \n\nCommited to branch 'deprecheck-fixes' with message:\n"${message}"\n\nChanges pushed to remote repository.`);
          
          // Reset PR flow
          setPrStatus('idle');
          setReport(null);
          setCode('');
          setFixReview(null);
          setScannedFiles([]);
          setActiveTab('scanner');
      }, 1500);
  };

  const predictionCount = report?.issues.filter(i => i.isPrediction).length || 0;

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 w-full border-b backdrop-blur supports-[backdrop-filter]:bg-white/60 transition-colors duration-300 ${isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white/80'}`}>
        <div className="container mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold shadow-sm ${isDarkMode ? 'bg-indigo-500 text-white' : 'bg-slate-900 text-white'}`}>D</div>
            <h1 className={`font-bold text-xl tracking-tight ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>DepreCheck AI</h1>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Theme Toggle */}
             <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-full transition-colors ${isDarkMode ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
             >
                {isDarkMode ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                )}
             </button>

            {/* Dependency Status Widget (In Navbar) */}
            {depStats && (
                <div className="relative">
                    <button 
                       onClick={() => setShowDeps(!showDeps)}
                       className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                           depStats.breaking > 0 
                           ? (isDarkMode ? 'bg-red-900/30 text-red-300 border-red-800 hover:bg-red-900/50' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100')
                           : (isDarkMode ? 'bg-green-900/30 text-green-300 border-green-800 hover:bg-green-900/50' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100')
                       }`}
                       title="Click to view dependency details"
                    >
                        {depStats.breaking > 0 ? (
                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                           </svg>
                        ) : (
                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                           </svg>
                        )}
                        <span>{depStats.breaking > 0 ? `${depStats.breaking} Breaking Changes` : 'Libraries Compatible'}</span>
                        <span className={`px-1.5 py-0.5 rounded-full border border-current opacity-60 text-[10px] min-w-[20px] text-center ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>{depStats.total}</span>
                    </button>

                    {showDeps && (
                        <>
                          <div className="fixed inset-0 z-40 cursor-default" onClick={() => setShowDeps(false)}></div>
                          <div className={`absolute top-full right-0 mt-2 w-96 rounded-xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 origin-top-right z-50 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                              <div className={`p-3 border-b flex justify-between items-center ${isDarkMode ? 'border-slate-800 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
                                  <h4 className={`font-bold text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Dependency Audit</h4>
                                  <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                    Live Status
                                  </span>
                              </div>
                              <div className="max-h-[350px] overflow-y-auto">
                                  {report?.dependencies?.map((dep, i) => (
                                      <div key={i} className={`p-3 border-b last:border-0 transition-colors ${isDarkMode ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-100 hover:bg-slate-50'}`}>
                                          <div className="flex justify-between mb-1">
                                              <span className={`font-semibold text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{dep.packageName}</span>
                                              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                                  dep.compatibilityStatus === 'Compatible' ? (isDarkMode ? 'bg-green-900/20 text-green-400 border-green-800' : 'bg-green-100 text-green-700 border-green-200') :
                                                  dep.compatibilityStatus === 'Breaking Changes' ? (isDarkMode ? 'bg-red-900/20 text-red-400 border-red-800' : 'bg-red-100 text-red-700 border-red-200') :
                                                  (isDarkMode ? 'bg-amber-900/20 text-amber-400 border-amber-800' : 'bg-amber-100 text-amber-700 border-amber-200')
                                              }`}>
                                                  {dep.compatibilityStatus}
                                              </span>
                                          </div>
                                          <div className="flex justify-between text-xs text-slate-500 font-mono">
                                              <span>v{dep.currentVersion} → v{dep.latestVersion}</span>
                                          </div>
                                          {dep.actionRequired && (
                                              <p className="text-[10px] text-slate-500 mt-1 italic">"{dep.actionRequired}"</p>
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
            <nav className={`flex gap-1 p-1 rounded-lg border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
               <button 
                 onClick={() => setActiveTab('scanner')}
                 className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'scanner' ? (isDarkMode ? 'bg-slate-800 shadow-sm text-white' : 'bg-white shadow-sm text-slate-900') : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
               >
                 Scanner
               </button>
               <button 
                 onClick={() => setActiveTab('pr-interceptor')}
                 className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'pr-interceptor' ? (isDarkMode ? 'bg-slate-800 shadow-sm text-white' : 'bg-white shadow-sm text-slate-900') : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
               >
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                 PR Interceptor
               </button>
               <button 
                 onClick={() => setActiveTab('shadow-mode')}
                 className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'shadow-mode' ? (isDarkMode ? 'bg-slate-800 shadow-sm text-white' : 'bg-white shadow-sm text-slate-900') : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
               >
                 <span className={`${activeTab === 'shadow-mode' ? 'text-green-500' : 'text-slate-400'}`}>⚡</span>
                 Shadow Mode
               </button>
               <button 
                 onClick={() => setActiveTab('debugger')}
                 className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'debugger' ? (isDarkMode ? 'bg-slate-800 shadow-sm text-white' : 'bg-white shadow-sm text-slate-900') : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
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
        ) : activeTab === 'shadow-mode' ? (
          /* ================= SHADOW MODE EMULATOR TAB ================= */
          <div className="animate-in fade-in duration-500">
             <ShadowModeEmulator />
          </div>
        ) : activeTab === 'pr-interceptor' ? (
          /* ================= PR INTERCEPTOR TAB ================= */
          <div className="animate-in fade-in duration-500">
            <div className="text-center mb-8">
               <h2 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>AI Pull Request Interceptor</h2>
               <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>Acts as a firewall, blocking PRs that add deprecated or risky code.</p>
            </div>

            {/* Config Section */}
            {prStatus === 'idle' && !report && (
                 <div className={`max-w-xl mx-auto p-8 rounded-xl border shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div className="flex flex-col gap-4">
                        <label className={`text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Repository or Local Code to Intercept</label>
                        <div className="flex gap-2">
                             <input 
                                type="text" 
                                placeholder="https://github.com/user/repo" 
                                className={`flex-1 rounded-md border px-3 py-2 text-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900'}`}
                                value={repoUrl}
                                onChange={(e) => setRepoUrl(e.target.value)}
                              />
                             <Button onClick={() => handleLoadRepo(true)} isLoading={loading} className="bg-slate-900 dark:bg-indigo-600 dark:hover:bg-indigo-700">
                                Check PR
                             </Button>
                        </div>
                        <div className="text-center text-xs text-slate-400 font-medium">OR</div>
                         
                         {/* File Selection Area */}
                         <div className="grid grid-cols-2 gap-4">
                             {/* Folder Button */}
                             <div className={`flex flex-col gap-2 items-center justify-center p-4 border-2 border-dashed rounded-lg transition-colors cursor-pointer group ${isDarkMode ? 'border-slate-700 hover:bg-slate-800/50' : 'border-slate-200 hover:bg-slate-50'}`} onClick={() => folderInputRef.current?.click()}>
                                 <input 
                                    type="file" 
                                    ref={folderInputRef}
                                    className="hidden"
                                    // @ts-ignore - webkitdirectory is standard in all modern browsers but not in TS definition
                                    webkitdirectory=""
                                    directory=""
                                    multiple
                                    onChange={handleFolderSelect}
                                  />
                                 <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isDarkMode ? 'bg-blue-900/30 text-blue-400 group-hover:bg-blue-900/50' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100 group-hover:scale-110'}`}>
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                                 </div>
                                 <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Select Folder</span>
                            </div>

                             {/* Files Button */}
                             <div className={`flex flex-col gap-2 items-center justify-center p-4 border-2 border-dashed rounded-lg transition-colors cursor-pointer group ${isDarkMode ? 'border-slate-700 hover:bg-slate-800/50' : 'border-slate-200 hover:bg-slate-50'}`} onClick={() => fileInputRef.current?.click()}>
                                 <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    className="hidden"
                                    multiple
                                    onChange={handleFileSelect}
                                  />
                                 <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isDarkMode ? 'bg-indigo-900/30 text-indigo-400 group-hover:bg-indigo-900/50' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 group-hover:scale-110'}`}>
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                 </div>
                                 <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Select Files</span>
                            </div>
                        </div>
                    </div>
                 </div>
            )}
            
            {/* Display Selected Files for Context */}
            {scannedFiles.length > 0 && !report && (
                <div className={`max-w-4xl mx-auto mb-6 border rounded-lg overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className={`px-4 py-3 border-b flex justify-between items-center ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center gap-4">
                            <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                               <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                               Review Files ({scannedFiles.filter(f => f.selected).length}/{scannedFiles.length})
                            </h3>
                            <div className="flex gap-2 text-xs">
                                <button onClick={() => toggleAllFiles(true)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium hover:underline">Select All</button>
                                <span className="text-slate-300 dark:text-slate-600">|</span>
                                <button onClick={() => toggleAllFiles(false)} className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium hover:underline">Deselect All</button>
                            </div>
                        </div>
                        <button onClick={() => setScannedFiles([])} className="text-xs text-red-500 hover:text-red-700 hover:underline">Clear</button>
                    </div>
                    
                    <div className={`max-h-64 overflow-y-auto p-0 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                        <table className="w-full text-left text-xs">
                            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                                {scannedFiles.map((f, i) => (
                                    <tr key={i} className={`transition-colors cursor-pointer ${f.selected ? (isDarkMode ? 'bg-blue-900/20 hover:bg-blue-900/30' : 'bg-blue-50/30 hover:bg-slate-50') : (isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50')}`} onClick={() => toggleFileSelection(i)}>
                                        <td className="px-4 py-2 w-8">
                                            <input 
                                                type="checkbox" 
                                                checked={f.selected} 
                                                onChange={() => {}} // Handled by tr click
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                        </td>
                                        <td className={`px-2 py-2 font-mono truncate max-w-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{f.path}</td>
                                        <td className="px-4 py-2 text-right text-slate-400 font-mono">
                                            {f.content.length} bytes
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className={`px-4 py-3 border-t flex justify-end ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                         <Button onClick={runLocalScan} disabled={scannedFiles.filter(f => f.selected).length === 0} isLoading={loading} className="w-full sm:w-auto bg-slate-900 dark:bg-indigo-600">
                            Start Interceptor Scan
                         </Button>
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
               onCommit={handleCommit}
            />
            
            {/* If Fix All triggered in PR mode, show the split editor comparison below */}
            {fixReview && (
               <div className="mt-8 animate-in slide-in-from-bottom-4">
                  <div className="flex justify-between items-center mb-3">
                      <h3 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Migration Preview</h3>
                      <div className="flex gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${isDarkMode ? 'bg-green-900/30 text-green-300 border-green-800' : 'bg-green-100 text-green-700 border-green-200'}`}>
                             Auto-Fix Applied
                          </span>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 h-[500px]">
                      <div className={`flex flex-col rounded-lg overflow-hidden border shadow-sm ${isDarkMode ? 'border-red-900/50 bg-slate-950' : 'border-red-200 bg-slate-950'}`}>
                          <CodeEditor 
                              value={fixReview.original} 
                              onChange={() => {}} 
                              readOnly={true} 
                              className="h-full border-none"
                              highlights={fixReview.originalHighlights}
                              highlightColor="red"
                          />
                      </div>
                      <div className={`flex flex-col rounded-lg overflow-hidden border shadow-sm ${isDarkMode ? 'border-green-900/50 bg-slate-950' : 'border-green-200 bg-slate-950'}`}>
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
                      <div className={`mt-6 p-4 border rounded-lg flex items-center justify-between ${isDarkMode ? 'bg-green-900/10 border-green-900/30' : 'bg-green-50 border-green-200'}`}>
                           <div>
                               <h4 className={`font-bold ${isDarkMode ? 'text-green-400' : 'text-green-900'}`}>Health Score Updated</h4>
                               <p className={`text-sm ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>New analysis confirms fixes are valid.</p>
                           </div>
                           <div className={`text-4xl font-black ${isDarkMode ? 'text-green-500' : 'text-green-600'}`}>
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
                <h2 className={`text-3xl font-bold mb-3 tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Future-Proof Your Codebase</h2>
                <p className={`text-lg ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Scan for deprecated libraries, breaking changes, and manage package upgrades efficiently.
                </p>
                <div className="mt-4 flex justify-center">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-sm ${isDarkMode ? 'bg-violet-900/30 text-violet-300 border-violet-800' : 'bg-violet-100 text-violet-700 border-violet-200'}`}>
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
                    <div className={`flex border-b w-full mb-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                        <button 
                            onClick={() => setInputMode('manual')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${inputMode === 'manual' ? (isDarkMode ? 'border-indigo-400 text-white' : 'border-slate-900 text-slate-900') : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            Manual / Editor
                        </button>
                        <button 
                            onClick={() => setInputMode('git')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${inputMode === 'git' ? (isDarkMode ? 'border-violet-400 text-violet-300' : 'border-violet-500 text-violet-700') : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                            Git Repository
                        </button>
                    </div>
                )}

                <div className="flex flex-col gap-2" id="main-editor">
                  
                  {inputMode === 'git' && !fixReview ? (
                      <div className={`border rounded-lg p-8 shadow-sm text-center space-y-4 animate-in fade-in zoom-in-95 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                          <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-violet-900/30 text-violet-400' : 'bg-violet-100 text-violet-600'}`}>
                              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                          </div>
                          <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Scan Public Repository</h3>
                          <p className={`text-sm max-w-md mx-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              Enter a GitHub/GitLab URL. We will clone it to a secure sandbox, filter for source code and dependency files, and analyze it.
                          </p>
                          <div className="flex gap-2 max-w-lg mx-auto">
                              <input 
                                type="text" 
                                placeholder="https://github.com/username/repo" 
                                className={`flex-1 rounded-md border px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'border-slate-300'}`}
                                value={repoUrl}
                                onChange={(e) => setRepoUrl(e.target.value)}
                              />
                              <Button onClick={() => handleLoadRepo(false)} isLoading={loading} className="bg-violet-600 hover:bg-violet-700">
                                  Load Repo
                              </Button>
                          </div>
                      </div>
                  ) : fixReview ? (
                    /* Split View Comparison Mode (Bulk Fix) */
                    <div className="animate-in fade-in duration-300">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className={`text-sm font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${isDarkMode ? 'bg-violet-900/50 text-violet-300' : 'bg-violet-100 text-violet-600'}`}>⚡</span>
                                Bulk Fix Review
                            </h3>
                            <Button variant="secondary" onClick={handleExitComparison} className={`text-xs h-8 ${isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700' : ''}`}>
                                Exit Review
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 h-96">
                            {/* Left: Original */}
                            <div className={`flex flex-col rounded-lg overflow-hidden border shadow-sm bg-slate-950 ${isDarkMode ? 'border-red-900/50' : 'border-red-200'}`}>
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
                            <div className={`flex flex-col rounded-lg overflow-hidden border shadow-sm bg-slate-950 ${isDarkMode ? 'border-green-900/50' : 'border-green-200'}`}>
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
                        className={`h-80 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}
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
                      <label htmlFor="file-upload" className={`cursor-pointer text-sm font-medium flex items-center gap-2 px-3 py-2 rounded-md transition-colors border border-transparent ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-200'}`}>
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
                        <Button variant="ghost" onClick={() => { setCode(''); setReport(null); setError(null); setPreviewIssue(null); setFixReview(null); setHighlightedText(null); setInputMode('manual'); setScannedFiles([]); }} className={isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : ''}>Clear</Button>
                        
                        {!fixReview && inputMode === 'manual' && (
                            <Button onClick={() => handleAnalyze()} isLoading={loading} disabled={!code.trim()} className={isDarkMode ? 'bg-indigo-600 hover:bg-indigo-700' : ''}>
                                Analyze Code
                            </Button>
                        )}

                        {/* If in Git/Local mode, show Analyze button only if code is loaded */}
                        {!fixReview && (inputMode === 'git' || inputMode === 'local') && code.length > 0 && (
                             <Button onClick={() => handleAnalyze()} isLoading={loading} className={isDarkMode ? 'bg-indigo-600 hover:bg-indigo-700' : ''}>
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
                  <div className={`border px-4 py-4 rounded-lg flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 ${isDarkMode ? 'bg-red-900/20 border-red-900/50 text-red-400' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    <div className={`p-1.5 rounded-full flex-shrink-0 mt-0.5 ${isDarkMode ? 'bg-red-900/50' : 'bg-red-100'}`}>
                      <svg className={`w-4 h-4 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                        <h3 className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Analysis Report</h3>
                        {/* Only show Fix All if there are issues AND we are not already in review mode */}
                        {report.issues.length > 0 && !fixReview && (
                           <button 
                             onClick={handleFixAll}
                             className="group relative inline-flex items-center justify-center gap-2 px-6 py-2.5 font-semibold text-white transition-all duration-300 bg-slate-900 dark:bg-indigo-600 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 overflow-hidden"
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
                           <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold border ${isDarkMode ? 'bg-green-900/20 text-green-400 border-green-800' : 'bg-green-100 text-green-700 border-green-200'}`}>
                               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                               </svg>
                               Latest Fixes Applied
                           </span>
                        )}
                    </div>
                    <div className={`text-xs font-mono border px-2 py-1 rounded self-start md:self-auto ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-400'}`}>
                        {new Date(report.timestamp).toLocaleString()}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Health Score */}
                    <div className={`p-6 rounded-lg border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
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
                    <div className={`md:col-span-2 p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Executive Summary</h4>
                        <p className={`leading-relaxed text-sm md:text-base ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{report.summary}</p>
                    </div>
                </div>
                
                {report.dependencies && report.dependencies.length > 0 && (
                   <DependencyTable dependencies={report.dependencies} />
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Col: Chart + Stats */}
                    <div className="lg:col-span-1 space-y-6">
                        <TimelineChart issues={report.issues} />
                        
                        <div className={`border rounded-lg p-5 shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                            <h4 className={`text-sm font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Issues by Severity</h4>
                            <div className="space-y-3">
                                {(['Critical', 'Warning', 'Info'] as Severity[]).map(sev => {
                                    const count = report.issues.filter(i => i.severity === sev && !i.isPrediction).length;
                                    return (
                                        <div key={sev} className="flex items-center justify-between text-sm group">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${
                                                    sev === 'Critical' ? 'bg-red-500 ring-2 ring-red-500/30' :
                                                    sev === 'Warning' ? 'bg-amber-500 ring-2 ring-amber-500/30' : 'bg-blue-500 ring-2 ring-blue-500/30'
                                                }`} />
                                                <span className={`font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{sev}</span>
                                            </div>
                                            <span className={`font-bold px-2 py-0.5 rounded transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-200 group-hover:bg-slate-700' : 'bg-slate-50 text-slate-900 group-hover:bg-slate-100'}`}>{count}</span>
                                        </div>
                                    );
                                })}

                                {/* Future Prediction Stat */}
                                <div className={`flex items-center justify-between text-sm group pt-2 mt-2 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                                    <div className="flex items-center gap-2">
                                        <span className={`flex items-center justify-center w-4 h-4 text-xs rounded-full ${isDarkMode ? 'bg-violet-900/30 text-violet-400' : 'bg-violet-100 text-violet-600'}`}>🔮</span>
                                        <span className={`font-semibold ${isDarkMode ? 'text-violet-400' : 'text-violet-700'}`}>Future Predictions</span>
                                    </div>
                                    <span className={`font-bold px-2 py-0.5 rounded transition-colors ${isDarkMode ? 'bg-violet-900/20 text-violet-300 group-hover:bg-violet-900/30' : 'bg-violet-50 text-violet-700 group-hover:bg-violet-100'}`}>{predictionCount}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Col: Issue List */}
                    <div className="lg:col-span-2 space-y-8">
                        {report.issues.length === 0 ? (
                            <div className={`border rounded-lg p-8 text-center animate-in fade-in zoom-in-95 ${isDarkMode ? 'bg-green-900/10 border-green-900/30 text-green-400' : 'bg-green-50 border-green-200 text-green-800'}`}>
                                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 shadow-sm ${isDarkMode ? 'bg-green-900/30' : 'bg-green-100'}`}>
                                   <svg className={`w-8 h-8 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                   </svg>
                                </div>
                                <h4 className={`font-bold text-xl mb-2 ${isDarkMode ? 'text-green-300' : 'text-green-900'}`}>All Systems Go!</h4>
                                <p className={isDarkMode ? 'text-green-400' : 'text-green-700'}>Your code is fully optimized, secure, and free of known deprecation risks.</p>
                            </div>
                        ) : (
                            <>
                                {/* Future Predictions Section */}
                                {report.issues.some(i => i.isPrediction) && (
                                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                                        <div className={`flex items-center gap-3 mb-4 p-4 border rounded-lg shadow-sm ${isDarkMode ? 'bg-slate-900 border-violet-900/50 from-violet-900/10 to-transparent bg-gradient-to-r' : 'bg-gradient-to-r from-violet-50 to-white border-violet-100'}`}>
                                           <div className={`p-2 rounded-md shadow-sm text-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>🔮</div>
                                           <div>
                                              <h4 className={`font-bold leading-tight ${isDarkMode ? 'text-violet-300' : 'text-violet-900'}`}>Future API Predictions</h4>
                                              <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-violet-400' : 'text-violet-700'} opacity-80`}>AI-forecasted deprecations (6-12 months) based on trends</p>
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
                                        <div className={`flex items-center gap-3 mb-4 p-4 border rounded-lg shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                           <div className={`p-2 rounded-md shadow-sm text-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>⚠️</div>
                                           <div>
                                              <h4 className={`font-bold leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Detected Deprecations</h4>
                                              <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} opacity-80`}>Immediate fixes required for code health</p>
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