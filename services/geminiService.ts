import { GoogleGenAI } from "@google/genai";
import { AiFeature } from '../types';
import { PROMPT_TEMPLATES, COMPLETION_PROMPT_TEMPLATE, QUERY_PROMPT_TEMPLATE } from '../constants';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export async function runAiTask(
  feature: AiFeature,
  language: string,
  code: string
): Promise<string> {
  if (!code.trim()) {
    return "Please select some code or have code in the active file to use this feature.";
  }

  try {
    const prompt = PROMPT_TEMPLATES[feature](language, code);
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        return `An error occurred: ${error.message}`;
    }
    return "An unknown error occurred while contacting the AI service.";
  }
}

export async function runAiQuery(
  language: string,
  code: string,
  question: string
): Promise<string> {
  if (!code.trim()) {
    return "The active file is empty, so there's no context for your question.";
  }
  if (!question.trim()) {
    return "Please enter a question.";
  }

  try {
    const prompt = QUERY_PROMPT_TEMPLATE(language, code, question);
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API for query:", error);
    if (error instanceof Error) {
        return `An error occurred: ${error.message}`;
    }
    return "An unknown error occurred while contacting the AI service.";
  }
}

export async function getAiCodeCompletion(
  language: string,
  codeBeforeCursor: string,
  codeAfterCursor: string
): Promise<string> {
  if (!codeBeforeCursor.trim()) {
    return "";
  }

  try {
    const prompt = COMPLETION_PROMPT_TEMPLATE(language, codeBeforeCursor, codeAfterCursor);
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.2,
        maxOutputTokens: 64,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    let suggestion = response.text;
    suggestion = suggestion.replace(/^```(\w*\n)?/, '').replace(/```$/, '').trim();

    return suggestion;
  } catch (error) {
    console.error("Error getting AI code completion:", error);
    return ""; // Return empty on error to not break the editor
  }
}