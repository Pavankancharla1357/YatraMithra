import { GoogleGenAI } from "@google/genai";

/**
 * Robustly retrieves the Gemini API Key from various possible sources.
 * Checks process.env and import.meta.env for both GEMINI_API_KEY and GEMINI_API_KEY_1.
 */
export const getGeminiApiKey = (): string => {
  const sources = [
    // Node-style process.env (often injected by Vite define)
    (process as any).env?.GEMINI_API_KEY_1,
    (process as any).env?.GEMINI_API_KEY,
    (process as any).env?.VITE_GEMINI_API_KEY_1,
    (process as any).env?.VITE_GEMINI_API_KEY,
    
    // Vite-style import.meta.env
    (import.meta as any).env?.VITE_GEMINI_API_KEY_1,
    (import.meta as any).env?.VITE_GEMINI_API_KEY,
    (import.meta as any).env?.GEMINI_API_KEY_1,
    (import.meta as any).env?.GEMINI_API_KEY,
  ];

  // Find the first non-empty, non-placeholder string
  const apiKey = sources.find(s => 
    typeof s === 'string' && 
    s.trim() !== '' && 
    s !== 'AI Studio Free Tier' &&
    s !== 'undefined' &&
    s !== 'null'
  );

  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please ensure it is set in the Secrets menu as GEMINI_API_KEY.");
  }

  return apiKey.trim();
};

/**
 * Returns a fresh instance of GoogleGenAI using the best available API key.
 */
export const getGeminiInstance = (): GoogleGenAI => {
  const apiKey = getGeminiApiKey();
  return new GoogleGenAI({ apiKey });
};
