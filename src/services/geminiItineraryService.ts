import { ThinkingLevel } from "@google/genai";
import { getGeminiInstance } from "./gemini";

export interface ItinerarySuggestion {
  title: string;
  description: string;
  category: string;
  estimatedCost: string;
  duration: string;
}

export interface FullItinerary {
  destination: string;
  total_estimated_budget: string;
  days: {
    day: number;
    plan: {
      time: string;
      activity: string;
      location: string;
      cost_estimate: string;
    }[];
  }[];
  tips: string[];
  packing_suggestions: string[];
}

const getAi = () => {
  return getGeminiInstance();
};

export const generateFullItinerary = async (
  destination: string,
  days: number,
  budget: string,
  style: string,
  startLocation: string
): Promise<FullItinerary> => {
  try {
    const ai = getAi();
    const prompt = `
      You are an expert travel planner.
      Create a detailed travel itinerary based on the user's input.

      User Input:
      - Destination: ${destination}
      - Number of days: ${days}
      - Budget: ₹${budget} (Indian Rupees)
      - Travel style: ${style} (budget/luxury/adventure/relaxed)
      - Starting location: ${startLocation}

      Instructions:
      - Create a day-wise itinerary
      - Include places to visit, timing, and short descriptions
      - Suggest local food and experiences
      - Estimate daily cost in Indian Rupees (₹)
      - Keep total cost within budget
      - Make it realistic (distance + travel time considered)

      Output format (STRICT JSON ONLY):
      {
        "destination": "",
        "total_estimated_budget": "",
        "days": [
          {
            "day": 1,
            "plan": [
              {
                "time": "",
                "activity": "",
                "location": "",
                "cost_estimate": ""
              }
            ]
          }
        ],
        "tips": [],
        "packing_suggestions": []
      }
    `;

    const result = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });

    const text = result.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Error generating full itinerary:", error);
    throw error;
  }
};

export const getAiItinerarySuggestions = async (
  destination: string,
  travelStyle: string,
  existingActivities: string[]
): Promise<ItinerarySuggestion[]> => {
  try {
    const ai = getAi();
    const prompt = `
      Suggest 5 unique and exciting travel activities for a trip to ${destination}.
      Travel Style: ${travelStyle}
      Already planned activities: ${existingActivities.join(", ")}
      
      Return a JSON array of suggestions. Each suggestion should include:
      - title: string
      - description: string (short and engaging)
      - category: string (e.g., Adventure, Food, Culture, Relaxation)
      - estimatedCost: string (e.g., "₹1500 - ₹3000", "Free")
      - duration: string (e.g., "2 hours", "Full day")
    `;

    const result = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });

    const text = result.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Error getting AI itinerary suggestions:", error);
    throw error;
  }
};
