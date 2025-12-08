import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisReport } from '../types';

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
            description: "Estimated date (YYYY-MM-DD) when this feature will break. If unknown, estimate based on typical LTS cycles.",
          },
          category: {
            type: Type.STRING,
            enum: ["Security", "Deprecation", "Performance", "Standard"],
          },
        },
        required: ["severity", "title", "description", "affectedCode", "replacementCode", "category", "estimatedEndOfLife"],
      },
    },
    dependencies: {
      type: Type.ARRAY,
      description: "List of detected packages/libraries and their update status. Populate this if the input looks like a dependency file (package.json, requirements.txt) or has imports.",
      items: {
        type: Type.OBJECT,
        properties: {
          packageName: { type: Type.STRING },
          currentVersion: { type: Type.STRING },
          latestVersion: { type: Type.STRING },
          compatibilityStatus: { type: Type.STRING, enum: ['Compatible', 'Breaking Changes', 'Unknown'] },
          actionRequired: { type: Type.STRING, description: "Short advice, e.g., 'Upgrade immediately' or 'Wait for v5'" }
        },
        required: ["packageName", "currentVersion", "latestVersion", "compatibilityStatus", "actionRequired"]
      }
    }
  },
  required: ["overallHealthScore", "summary", "issues"],
};

export const analyzeCode = async (code: string, context?: string): Promise<AnalysisReport> => {
  const ai = getClient();
  
  const systemPrompt = `
    You are a Senior Software Architect, Security Auditor, and Dependency Manager.
    Your task is to scan the provided code (or dependency file like package.json/requirements.txt) for:
    1. Deprecated libraries, methods, or patterns.
    2. Upcoming deprecations (features warned to be removed in the next 6-12 months).
    3. Security vulnerabilities related to outdated dependencies.
    4. Dependency Analysis: If the input is a dependency manifest, list packages that need upgrades and check for compatibility issues.

    For every issue found, predict an "Estimated End of Life" date based on official roadmaps.
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
    
    // Enrich with IDs and timestamp
    return {
      ...data,
      timestamp: new Date().toISOString(),
      issues: data.issues.map((issue: any, index: number) => ({
        ...issue,
        id: `issue-${index}-${Date.now()}`
      }))
    };

  } catch (error: any) {
    console.error("Analysis failed:", error);
    
    // Enhanced Error Handling
    let userMessage = "An unexpected error occurred during analysis.";
    
    // Check for specific GoogleGenAI error structures or HTTP status codes if available
    const errorMsg = error.message || "";
    const errorStatus = error.status || 0;

    if (errorMsg.includes("API_KEY") || errorStatus === 401 || errorStatus === 403) {
      userMessage = "Invalid API Key. Please ensure your environment is configured correctly.";
    } else if (errorStatus === 429 || errorMsg.includes("quota") || errorMsg.includes("limit")) {
      userMessage = "Rate limit exceeded. You are sending requests too quickly. Please wait a moment.";
    } else if (errorStatus === 503 || errorMsg.includes("overloaded")) {
      userMessage = "The AI service is currently overloaded. Please try again in a few minutes.";
    } else if (errorMsg.includes("safety") || errorMsg.includes("blocked")) {
      userMessage = "The model declined to generate a response due to safety policies. Please modify your input.";
    } else if (errorMsg.includes("fetch failed")) {
      userMessage = "Network error. Please check your internet connection.";
    }

    throw new Error(userMessage);
  }
};