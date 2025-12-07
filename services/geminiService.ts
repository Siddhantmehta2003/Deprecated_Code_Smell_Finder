import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisReport } from '../types';

// --- Client-Side Configuration (Fallback) ---
const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const reportSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    overallHealthScore: {
      type: Type.NUMBER,
      description: "A score from 0 to 100, where 100 is perfect code health.",
    },
    summary: {
      type: Type.STRING,
      description: "A brief executive summary of the codebase status.",
    },
    issues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          severity: {
            type: Type.STRING,
            enum: ["Critical", "Warning", "Info"],
          },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          affectedCode: { type: Type.STRING },
          replacementCode: { type: Type.STRING },
          estimatedEndOfLife: {
            type: Type.STRING,
            description: "Estimated date (YYYY-MM-DD) when this feature will break or be unsupported. If unknown, estimate based on typical LTS cycles.",
          },
          category: {
            type: Type.STRING,
            enum: ["Security", "Deprecation", "Performance", "Standard"],
          },
        },
        required: ["severity", "title", "description", "affectedCode", "replacementCode", "category", "estimatedEndOfLife"],
      },
    },
  },
  required: ["overallHealthScore", "summary", "issues"],
};

// --- Backend Configuration ---
const BACKEND_URL = 'http://localhost:8000/analyze';

/**
 * Analyses code using the Python backend if available, 
 * otherwise falls back to client-side Gemini API.
 */
export const analyzeCode = async (code: string, context?: string): Promise<AnalysisReport> => {
  const timestamp = new Date().toISOString();
  
  // 1. Try Backend
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout to detect if backend is down

    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, context }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      console.log("Analysis via Python Backend successful");
      return enrichReport(data, timestamp);
    }
  } catch (err) {
    console.warn("Backend unavailable, falling back to client-side API:", err);
  }

  // 2. Fallback to Client-Side
  return analyzeCodeClientSide(code, context, timestamp);
};

const analyzeCodeClientSide = async (code: string, context: string | undefined, timestamp: string): Promise<AnalysisReport> => {
  const ai = getClient();
  
  const systemPrompt = `
    You are a Senior Software Architect and Security Auditor specializing in Legacy Modernization.
    Your task is to scan the provided code for:
    1. Deprecated libraries, methods, or patterns.
    2. Upcoming deprecations (features warned to be removed in the next 6-12 months).
    3. Security vulnerabilities related to outdated dependencies.
    4. "Code Smells" that indicate reliance on unmaintained tech.

    For every issue found, predict an "Estimated End of Life" date based on official roadmaps (e.g., React, Python, Node.js release schedules) or security advisory trends.
    Provide a modern migration path (replacement code).
    
    Context: ${context || 'General Web/Software Development'}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: code,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: reportSchema,
        temperature: 0.2, 
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const data = JSON.parse(text);
    return enrichReport(data, timestamp);

  } catch (error) {
    console.error("Client-side analysis failed:", error);
    throw error;
  }
};

const enrichReport = (data: any, timestamp: string): AnalysisReport => {
  return {
    ...data,
    timestamp,
    issues: data.issues.map((issue: any, index: number) => ({
      ...issue,
      id: `issue-${index}-${Date.now()}`
    }))
  };
};