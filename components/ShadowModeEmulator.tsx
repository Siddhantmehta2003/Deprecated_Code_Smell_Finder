
import React, { useState, useEffect, useMemo } from 'react';
import { CodeEditor } from './CodeEditor';
import { Button } from './Button';

// --- Types & Interfaces ---

type Severity = 'Critical' | 'Warning' | 'Info';

interface BreakageRule {
  id: string;
  pattern: RegExp | string;
  severity: Severity;
  message: string;
  migrationSuggestion: string;
  fixReplacer?: (code: string, match: string) => string;
}

interface EmulatorProfile {
  id: string;
  name: string;
  versionLabel: string;
  description: string;
  icon: string;
  colorTheme: string;
  rules: BreakageRule[];
}

interface EmulationResult {
  score: number;
  breakages: DetectedBreakage[];
  patchedCode: string;
  logs: string[];
}

interface DetectedBreakage {
  ruleId: string;
  severity: Severity;
  message: string;
  line?: number;
  match: string;
  suggestion: string;
}

// --- Emulator Engine Logic ---

const EMULATOR_PROFILES: EmulatorProfile[] = [
  {
    id: 'react-19',
    name: 'React',
    versionLabel: 'v19 (Compiler Era)',
    description: 'Simulates React 19 environment with React Compiler, removal of forwardRef, and strict async component rules.',
    icon: '⚛️',
    colorTheme: 'blue',
    rules: [
      {
        id: 'no-forward-ref',
        pattern: /forwardRef\s*\(/g,
        severity: 'Critical',
        message: 'forwardRef is removed in React 19. Refs are now passed as standard props.',
        migrationSuggestion: 'Remove forwardRef wrapper and accept "ref" as a prop directly.',
        fixReplacer: (code) => code.replace(/forwardRef\s*\(\s*(?:async\s*)?function\s*([^(]*)\(([^)]*)\)/g, 'function $1($2)')
      },
      {
        id: 'use-callback-obsolete',
        pattern: /useCallback\(/g,
        severity: 'Warning',
        message: 'useCallback is often redundant with React Compiler auto-memoization.',
        migrationSuggestion: 'Remove useCallback unless specifically needed for external consumers.',
        fixReplacer: (code) => code.replace(/useCallback\(\s*\(\)\s*=>\s*{([^}]*)}\s*,\s*\[[^\]]*\]\s*\)/g, '() => { $1 }')
      },
      {
        id: 'no-default-props',
        pattern: /\.defaultProps\s*=/g,
        severity: 'Critical',
        message: 'defaultProps on function components are removed.',
        migrationSuggestion: 'Use default parameter values in the component function signature.',
      },
      {
        id: 'legacy-lifecycle',
        pattern: /componentWill(Mount|ReceiveProps|Update)/g,
        severity: 'Critical',
        message: 'Legacy lifecycle methods throw runtime errors in React 19.',
        migrationSuggestion: 'Migrate to useEffect or functional components.',
      }
    ]
  },
  {
    id: 'node-24',
    name: 'Node.js',
    versionLabel: 'v24 (ESM Only)',
    description: 'Simulates Node.js 24 environment where CommonJS is disabled by default and legacy FS APIs are gone.',
    icon: '🟢',
    colorTheme: 'green',
    rules: [
      {
        id: 'no-require',
        pattern: /require\s*\(['"][^'"]+['"]\)/g,
        severity: 'Critical',
        message: 'CommonJS "require" is disabled. Module loading failed.',
        migrationSuggestion: 'Switch to ESM "import" syntax.',
        fixReplacer: (code) => code.replace(/const\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\)/g, 'import $1 from "$2"')
      },
      {
        id: 'no-dirname',
        pattern: /__dirname/g,
        severity: 'Critical',
        message: '__dirname is not defined in ESM modules.',
        migrationSuggestion: 'Use import.meta.url and fileURLToPath.',
      },
      {
        id: 'fs-exists-removed',
        pattern: /fs\.exists\(/g,
        severity: 'Warning',
        message: 'fs.exists is hard-removed.',
        migrationSuggestion: 'Use fs.stat() or fs.access().',
      },
      {
        id: 'buffer-constructor',
        pattern: /new\s+Buffer\(/g,
        severity: 'Critical',
        message: 'Buffer() constructor throws SecurityError.',
        migrationSuggestion: 'Use Buffer.from() or Buffer.alloc().',
        fixReplacer: (code) => code.replace(/new\s+Buffer\(/g, 'Buffer.from(')
      }
    ]
  },
  {
    id: 'angular-2026',
    name: 'Angular',
    versionLabel: 'v20 (Zoneless)',
    description: 'Simulates Angular 2026. Zone.js is gone, Decorators are deprecated in favor of Signals.',
    icon: '🛡️',
    colorTheme: 'red',
    rules: [
      {
        id: 'input-decorator',
        pattern: /@Input\(\)/g,
        severity: 'Warning',
        message: '@Input decorator usage triggers legacy compatibility mode.',
        migrationSuggestion: 'Use the new signal-based input() function.',
        fixReplacer: (code) => code.replace(/@Input\(\)\s*(\w+)\s*:\s*([^;]+);/g, '$1 = input<$2>();')
      },
      {
        id: 'ng-if-directive',
        pattern: /\*ngIf/g,
        severity: 'Warning',
        message: '*ngIf directive is deprecated.',
        migrationSuggestion: 'Use the new @if block syntax.',
      },
      {
        id: 'zone-usage',
        pattern: /NgZone/g,
        severity: 'Critical',
        message: 'NgZone dependency injection failed. App is running Zoneless.',
        migrationSuggestion: 'Remove Zone.js dependencies and use Signals for reactivity.',
      }
    ]
  },
  {
    id: 'vue-5',
    name: 'Vue.js',
    versionLabel: 'v5 (Vapor Mode)',
    description: 'Simulates Vue 5. Options API is removed. V-Model breaking changes.',
    icon: '🔋',
    colorTheme: 'emerald',
    rules: [
      {
        id: 'options-api-data',
        pattern: /data\s*\(\)\s*\{/g,
        severity: 'Critical',
        message: 'Options API "data()" detected. Component failed to mount.',
        migrationSuggestion: 'Rewrite using Composition API (script setup).',
      },
      {
        id: 'legacy-v-model',
        pattern: /v-model:value/g,
        severity: 'Critical',
        message: 'v-model:value is not supported.',
        migrationSuggestion: 'Use standard v-model or defineModel().',
      },
      {
        id: 'vue-observable',
        pattern: /Vue\.observable/g,
        severity: 'Warning',
        message: 'Vue.observable is removed.',
        migrationSuggestion: 'Use reactive() from Vue core.',
        fixReplacer: (code) => code.replace(/Vue\.observable\(/g, 'reactive(')
      }
    ]
  }
];

// --- Helper Functions ---

const runSimulation = (code: string, profile: EmulatorProfile): EmulationResult => {
  const breakages: DetectedBreakage[] = [];
  let patchedCode = code;
  const logs: string[] = [`[System] Booting ${profile.name} ${profile.versionLabel} Kernel...`];

  profile.rules.forEach(rule => {
    // Check regex matches
    let match;
    const regex = typeof rule.pattern === 'string' ? new RegExp(rule.pattern, 'g') : rule.pattern;
    
    // Reset lastIndex if global
    regex.lastIndex = 0;

    let hasMatch = false;
    while ((match = regex.exec(code)) !== null) {
      hasMatch = true;
      // Calculate line number
      const codeUpToMatch = code.substring(0, match.index);
      const line = codeUpToMatch.split('\n').length;

      breakages.push({
        ruleId: rule.id,
        severity: rule.severity,
        message: rule.message,
        line,
        match: match[0],
        suggestion: rule.migrationSuggestion
      });
    }

    if (hasMatch) {
       if (rule.severity === 'Critical') {
           logs.push(`[Error] Runtime Exception: ${rule.message}`);
       } else {
           logs.push(`[Warn] Deprecation Notice: ${rule.message}`);
       }

       // Attempt simple patch
       if (rule.fixReplacer) {
           patchedCode = rule.fixReplacer(patchedCode, "");
       }
    }
  });

  if (breakages.length === 0) {
      logs.push(`[Success] Application mounted successfully in ${profile.versionLabel}.`);
  } else {
      logs.push(`[System] Process terminated with ${breakages.length} issues.`);
  }

  // Calculate Score (Simple Algorithm)
  let score = 100;
  breakages.forEach(b => {
    if (b.severity === 'Critical') score -= 25;
    if (b.severity === 'Warning') score -= 10;
    if (b.severity === 'Info') score -= 2;
  });
  score = Math.max(0, score);

  return {
    score,
    breakages,
    patchedCode: patchedCode !== code ? patchedCode : '',
    logs
  };
};

// --- Main Component ---

export const ShadowModeEmulator: React.FC = () => {
  const [activeProfileId, setActiveProfileId] = useState<string>(EMULATOR_PROFILES[0].id);
  const [code, setCode] = useState<string>('// Enter your code here to simulate future compatibility...\n\nfunction MyComponent(props) {\n  return (\n    <div>\n       Hello {props.name}\n    </div>\n  );\n}\n\n// Try pasting older React code with forwardRef!');
  
  // State for manual simulation Trigger
  const [simulationResult, setSimulationResult] = useState<EmulationResult | null>(null);
  const [isBooting, setIsBooting] = useState(false);

  const activeProfile = useMemo(() => 
    EMULATOR_PROFILES.find(p => p.id === activeProfileId) || EMULATOR_PROFILES[0], 
  [activeProfileId]);

  const handleStartSimulation = () => {
    setIsBooting(true);
    setSimulationResult(null); // Clear previous result
    
    // Simulate "Booting" time for effect
    setTimeout(() => {
        const result = runSimulation(code, activeProfile);
        setSimulationResult(result);
        setIsBooting(false);
    }, 1200);
  };

  // Dynamic Theme Colors
  const themeColors = {
    blue: 'from-blue-500 to-indigo-600',
    green: 'from-green-500 to-emerald-600',
    red: 'from-red-500 to-rose-600',
    emerald: 'from-emerald-500 to-teal-600',
  }[activeProfile.colorTheme] || 'from-slate-500 to-slate-700';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans p-6">
      
      {/* Header Widget */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row items-center justify-between bg-white dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 backdrop-blur-sm gap-4 shadow-sm">
        <div className="flex items-center gap-4 w-full md:w-auto">
           <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${themeColors} flex items-center justify-center text-2xl shadow-lg shadow-blue-500/20 dark:shadow-blue-900/20 text-white`}>
             {activeProfile.icon}
           </div>
           <div>
             <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Shadow-Mode Emulator</h2>
             <p className="text-xs text-slate-500 dark:text-slate-400">Simulating Environment: <span className="text-slate-700 dark:text-white font-mono">{activeProfile.versionLabel}</span></p>
           </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
           <div className="flex flex-col md:flex-row items-center gap-2">
               <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Target Kernel:</label>
               <select 
                 value={activeProfileId}
                 onChange={(e) => setActiveProfileId(e.target.value)}
                 className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-48 p-2.5"
               >
                 {EMULATOR_PROFILES.map(p => (
                   <option key={p.id} value={p.id}>{p.name} {p.versionLabel}</option>
                 ))}
               </select>
           </div>

           <button 
             onClick={handleStartSimulation}
             disabled={isBooting}
             className={`ml-4 px-5 py-2.5 rounded-lg font-bold text-sm shadow-xl transition-all flex items-center gap-2 border border-white/10 ${
                isBooting 
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed' 
                : `bg-gradient-to-r ${themeColors} text-white hover:scale-105 active:scale-95 hover:shadow-2xl`
             }`}
           >
             {isBooting ? (
                 <>
                   <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                   Booting Kernel...
                 </>
             ) : (
                 <>
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   Start Simulation
                 </>
             )}
           </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 h-[700px]">
         
         {/* Left Panel: Code Input */}
         <div className="flex flex-col gap-4">
            <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
               <div className="bg-slate-50 dark:bg-slate-950 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">src/input.js</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-500">Editor Active</span>
               </div>
               <div className="flex-1 relative">
                 <CodeEditor 
                   value={code} 
                   onChange={(val) => {
                       setCode(val);
                   }} 
                   className="absolute inset-0 h-full bg-transparent border-none"
                 />
               </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
               <button 
                 onClick={() => setCode(`import React, { forwardRef, useState } from 'react';\n\nconst MyInput = forwardRef((props, ref) => (\n  <input {...props} ref={ref} />\n));\n\nMyInput.defaultProps = { type: 'text' };`)}
                 className="text-xs px-3 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-colors shadow-sm"
               >
                 Load React Legacy Sample
               </button>
               <button 
                 onClick={() => setCode(`const fs = require('fs');\nconst path = require('path');\n\nif (fs.exists(__dirname + '/config', () => {})) {\n  console.log('Exists');\n}`)}
                 className="text-xs px-3 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-colors shadow-sm"
               >
                 Load Node.js Legacy Sample
               </button>
            </div>
         </div>

         {/* Right Panel: Emulator Output */}
         <div className="flex flex-col gap-4">
            
            {!simulationResult && !isBooting ? (
                // --- IDLE STATE ---
                <div className="h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-center p-8 border-dashed shadow-sm">
                    <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${themeColors} flex items-center justify-center mb-6 opacity-20`}>
                        <svg className="w-10 h-10 text-slate-900 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-500 dark:text-slate-400">Kernel Idle</h3>
                    <p className="text-slate-500 max-w-sm mt-2">
                        Select a target environment and click <span className="text-slate-700 dark:text-slate-300 font-semibold">Start Simulation</span> to boot the emulator and analyze compatibility.
                    </p>
                </div>
            ) : isBooting ? (
                // --- BOOTING STATE ---
                <div className="h-full bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center justify-center text-center p-8 relative overflow-hidden shadow-inner">
                    {/* Always keep booting screen dark for "console" effect, or make it light compatible? 
                        Let's keep it somewhat terminal-like but cleaner. */}
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
                    <div className="font-mono text-green-500 text-xs mb-4 w-64 text-left space-y-1 z-10">
                        <div>> boot {activeProfile.id}</div>
                        <div>> mounting virtual_fs...</div>
                        <div className="animate-pulse">> loading static_analyzer...</div>
                    </div>
                    <div className="w-64 h-1 bg-slate-800 rounded-full overflow-hidden z-10">
                        <div className={`h-full bg-gradient-to-r ${themeColors} animate-[shimmer_1s_infinite]`}></div>
                    </div>
                </div>
            ) : simulationResult && (
                // --- RESULT STATE ---
                <>
                    {/* Status Card */}
                    <div className="grid grid-cols-3 gap-4 h-32 animate-in fade-in slide-in-from-bottom-4">
                    <div className="col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-center items-center relative overflow-hidden group shadow-sm">
                        <div className={`absolute inset-0 bg-gradient-to-br ${themeColors} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-semibold z-10">Compatibility Score</span>
                        <span className={`text-5xl font-black z-10 mt-2 ${
                            simulationResult.score === 100 ? 'text-green-500 dark:text-green-400' :
                            simulationResult.score > 50 ? 'text-amber-500 dark:text-amber-400' : 'text-red-500'
                        }`}>
                            {simulationResult.score}
                        </span>
                    </div>
                    <div className="col-span-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 overflow-hidden relative shadow-inner">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent"></div>
                        <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Simulated Runtime Logs</h3>
                        <div className="font-mono text-xs space-y-1 h-full overflow-y-auto pb-4">
                            {simulationResult.logs.map((log, i) => (
                                <div key={i} className={`truncate ${
                                    log.includes('[Error]') ? 'text-red-600 dark:text-red-400' : 
                                    log.includes('[Warn]') ? 'text-amber-600 dark:text-amber-400' : 
                                    log.includes('[Success]') ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'
                                }`}>
                                <span className="opacity-50 mr-2">{new Date().toLocaleTimeString()}</span>
                                {log}
                                </div>
                            ))}
                        </div>
                    </div>
                    </div>

                    {/* Detailed Results */}
                    <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-lg animate-in fade-in slide-in-from-bottom-8 duration-500">
                        <div className="bg-slate-50 dark:bg-slate-950 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700 dark:text-slate-300">Predicted Runtime Exceptions</h3>
                        <span className="bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-xs px-2 py-0.5 rounded border border-red-200 dark:border-red-500/30">
                            {simulationResult.breakages.length} Events
                        </span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {simulationResult.breakages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 opacity-50">
                                <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <p>No breakages detected in {activeProfile.versionLabel}</p>
                            </div>
                        ) : (
                            simulationResult.breakages.map((b, idx) => (
                                <div key={idx} className={`p-3 rounded-lg border flex gap-3 ${
                                    b.severity === 'Critical' ? 'bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/50' : 'bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50'
                                }`}>
                                <div className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                    b.severity === 'Critical' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-amber-500'
                                }`}></div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className={`text-sm font-bold ${b.severity === 'Critical' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
                                            {b.message}
                                        </h4>
                                        <span className="text-[10px] font-mono text-slate-500">Line {b.line}</span>
                                    </div>
                                    <div className="bg-white dark:bg-slate-950/50 p-2 rounded border border-slate-200 dark:border-slate-800/50 font-mono text-xs text-slate-600 dark:text-slate-400 mb-2 truncate">
                                        {b.match}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-blue-600 dark:text-blue-400 font-semibold">Fix:</span>
                                        <span className="text-slate-600 dark:text-slate-400">{b.suggestion}</span>
                                    </div>
                                </div>
                                </div>
                            ))
                        )}
                        </div>

                        {/* Auto-Patch Preview */}
                        {simulationResult.patchedCode && (
                        <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950/30">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="text-xs font-bold text-green-600 dark:text-green-500 uppercase tracking-wider flex items-center gap-2">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                Auto-Migration Preview
                                </h4>
                                <button 
                                onClick={() => setCode(simulationResult.patchedCode)}
                                className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/50 px-2 py-1 rounded hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                                >
                                Apply Patches
                                </button>
                            </div>
                            <pre className="text-xs text-slate-600 dark:text-slate-500 font-mono overflow-x-auto p-2 bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-900">
                                {simulationResult.patchedCode.split('\n').slice(0, 3).join('\n')}
                                {simulationResult.patchedCode.split('\n').length > 3 && '\n...'}
                            </pre>
                        </div>
                        )}
                    </div>
                </>
            )}
         </div>
      </div>
    </div>
  );
};