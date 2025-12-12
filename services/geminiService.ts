import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisReport } from '../types';

const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const reportSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    overallHealthScore: {
      type: Type.NUMBER,
      description: "A score from 0 to 100. START at 100. Deduct 10 points for each Critical issue, 5 for Warning, 2 for Info. If NO issues are found, the score MUST be 100.",
    },
    summary: {
      type: Type.STRING,
      description: "A brief executive summary of the codebase status. If score is 100, congratulate the user.",
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
          isPrediction: {
            type: Type.BOOLEAN,
            description: "Set to true if this is a predicted future deprecation (not yet officially deprecated but shows signs).",
          },
          predictionConfidence: {
            type: Type.NUMBER,
            description: "Confidence score (0-100) for this prediction based on trends.",
          },
          riskFactors: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of reasons for prediction, e.g., 'Declining GitHub Activity', 'Roadmap Leak', 'Legacy Pattern'.",
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
    You are 'DepreCheck AI', a Senior Software Architect and Future-Tech predictor.
    Your task is to scan the provided code (or dependency file) for CURRENT issues and FUTURE risks.

    SCORING RULES:
    - Start with a Health Score of 100.
    - If you find NO issues, the score MUST remain 100.
    - Deduct 15 points for each CRITICAL issue.
    - Deduct 5 points for each WARNING.
    - Deduct 2 points for each INFO/PREDICTION.
    - If the code provided looks like it has already been fixed (e.g. uses modern APIs), DO NOT flag old issues.

    1. **Standard Deprecation**: Identify libraries/methods that are currently deprecated.
    2. **Future-API Prediction Engine**: Predict which APIs will likely be deprecated in the next 6-12 months.
       - Use your training data to simulate "GitHub commit trends" (e.g., libraries with slowing maintenance).
       - Look for "Roadmap Leaks" (known upcoming breaking changes in major frameworks like React, Next.js, Python, etc.).
       - Identify "Abandoned Maintainer Patterns" or "Security Issue Frequency".
       - Flag legacy patterns (e.g., class components in new React apps, 'var' in JS) as "Stagnant".
       - Mark these as 'isPrediction': true and provide a 'predictionConfidence' score (0-100).
    3. **Security**: Vulnerabilities related to outdated dependencies.

    For every issue, provide:
    - Estimated End of Life (Date).
    - Modern replacement code.
    - Risk factors (e.g., "Declining Community", "Maintained by single dev", "Frequent CVEs").
    
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