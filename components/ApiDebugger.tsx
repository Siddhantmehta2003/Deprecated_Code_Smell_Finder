import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Button } from './Button';

export const ApiDebugger: React.FC = () => {
  const [prompt, setPrompt] = useState('Tell me a programming joke about React.');
  const [model, setModel] = useState('gemini-2.5-flash');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);

  const availableModels = [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', desc: 'Fast, cost-efficient, low latency' },
    { id: 'gemini-2.5-flash-lite-latest', name: 'Gemini 2.5 Flash Lite', desc: 'Highest efficiency for simple tasks' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', desc: 'Reasoning, coding, complex tasks' },
  ];

  const handleTest = async () => {
    setLoading(true);
    setResponse(null);
    setLatency(null);
    
    const startTime = performance.now();
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // We use raw generateContent here to show the user the raw capabilities
      const result = await ai.models.generateContent({
        model: model,
        contents: prompt,
      });

      const endTime = performance.now();
      setLatency(Math.round(endTime - startTime));
      
      // Format the response for display
      const displayData = {
        model: model,
        latencyMs: Math.round(endTime - startTime),
        usageMetadata: result.usageMetadata,
        text: result.text,
        fullResponse: result
      };

      setResponse(JSON.stringify(displayData, null, 2));

    } catch (error: any) {
      setResponse(JSON.stringify({ 
        error: error.message, 
        code: error.status,
        stack: error.stack 
      }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2">
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">API Control Center</h2>
            <p className="text-slate-600 text-sm">
              Debug endpoints, view raw JSON responses, and monitor latency in real-time.
            </p>
          </div>
          <div className="bg-slate-100 px-3 py-1 rounded text-xs text-slate-600 font-mono">
            SDK: @google/genai
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Controls Sidebar */}
          <div className="md:col-span-4 lg:col-span-3 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Select Model</label>
              <div className="space-y-2">
                {availableModels.map((m) => (
                  <label 
                    key={m.id}
                    className={`block p-3 border rounded-lg cursor-pointer transition-all ${
                      model === m.id 
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                      : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="model" 
                      value={m.id}
                      checked={model === m.id}
                      onChange={(e) => setModel(e.target.value)}
                      className="sr-only"
                    />
                    <div className="text-sm font-bold text-slate-900">{m.name}</div>
                    <div className="text-xs text-slate-500 mt-1">{m.desc}</div>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-3">
              <div className="font-semibold text-slate-700 uppercase tracking-wider">Metrics</div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500">Status</span>
                <span className="flex items-center gap-1.5 text-green-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Ready
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Last Latency</span>
                <span className={`font-mono ${!latency ? 'text-slate-400' : 'text-slate-900'}`}>
                  {latency ? `${latency}ms` : '--'}
                </span>
              </div>
            </div>
            
            <Button onClick={handleTest} isLoading={loading} className="w-full">
              Run Request
            </Button>
          </div>

          {/* Input/Output Area */}
          <div className="md:col-span-8 lg:col-span-9 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Request Payload (Prompt)</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="Enter your prompt here..."
                className="w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm font-mono p-3 bg-white"
              />
            </div>

            <div className="flex-1 flex flex-col">
              <label className="block text-sm font-medium text-slate-700 mb-1">Response Inspector</label>
              <div className="relative flex-1 min-h-[400px] bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shadow-inner flex flex-col">
                <div className="bg-slate-900 px-4 py-2 text-xs text-slate-400 border-b border-slate-800 flex justify-between items-center">
                  <span className="font-mono">JSON Output</span>
                  <div className="flex gap-2">
                     <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">application/json</span>
                  </div>
                </div>
                <div className="relative flex-1 overflow-hidden">
                   <textarea 
                     readOnly
                     value={response || '// Response will appear here...'}
                     className="w-full h-full p-4 bg-transparent text-xs font-mono text-green-400 resize-none focus:outline-none"
                   />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};