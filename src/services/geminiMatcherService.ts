import { ThinkingLevel } from "@google/genai";
import { getGeminiInstance } from "./gemini";

export interface MatcherUser {
  budget: string;
  style: string;
  interests: string;
  personality: string;
}

export interface MatchResult {
  compatibility_score: number;
  match_summary: string;
  common_interests: string[];
  differences: string[];
  suggested_trip_type: string;
  confidence_level: "low" | "medium" | "high";
}

export interface SoulmateResult extends MatchResult {
  soulmate_uid: string;
  soulmate_name: string;
}

const getAi = () => {
  return getGeminiInstance();
};

export const findSoulmate = async (currentUser: MatcherUser, otherUsers: any[]): Promise<SoulmateResult> => {
  try {
    const ai = getAi();
    
    // Prepare the data for Gemini
    const othersData = otherUsers.map((u: any) => ({
      uid: u.uid,
      name: u.name || "Anonymous",
      age: u.age,
      style: u.travel_style,
      interests: Array.isArray(u.interests) ? u.interests.join(", ") : u.interests,
      bio: u.bio
    }));

    const prompt = `
      You are an expert travel matchmaker. I will give you a user's travel preferences and a list of other potential travel buddies.
      Your task is to find the single BEST "Travel Soulmate" for the user from the list.

      USER PREFERENCES:
      - Budget: ${currentUser.budget} INR
      - Style: ${currentUser.style}
      - Personality: ${currentUser.personality}
      - Interests: ${currentUser.interests}

      POTENTIAL BUDDIES:
      ${JSON.stringify(othersData, null, 2)}

      Analyze compatibility based on:
      1. Budget alignment (similar or complementary).
      2. Travel style synergy.
      3. Interest overlap.
      4. Personality balance.

      Return the result in JSON format:
      {
        "soulmate_uid": "the uid of the best match",
        "soulmate_name": "the name of the best match",
        "compatibility_score": number (0-100),
        "match_summary": "a short, engaging explanation of why they are soulmates",
        "common_interests": ["interest 1", "interest 2"],
        "differences": ["difference 1"],
        "suggested_trip_type": "a specific trip idea for them",
        "confidence_level": "high" | "medium" | "low"
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
    console.error("Error finding soulmate:", error);
    throw error;
  }
};

export const matchTravelers = async (userA: MatcherUser, userB: MatcherUser): Promise<MatchResult> => {
  try {
    const ai = getAi();
    const prompt = `
      You are an intelligent travel compatibility matcher.
      Match two users based on their travel preferences and personality.

      User A:
      - Budget: ${userA.budget}
      - Travel style: ${userA.style}
      - Interests: ${userA.interests}
      - Personality: ${userA.personality}

      User B:
      - Budget: ${userB.budget}
      - Travel style: ${userB.style}
      - Interests: ${userB.interests}
      - Personality: ${userB.personality}

      Instructions:
      - Calculate compatibility score (0–100)
      - Explain why they match
      - Highlight similarities and differences
      - Suggest what kind of trip they can enjoy together

      Output format (STRICT JSON ONLY):
      {
        "compatibility_score": 0,
        "match_summary": "",
        "common_interests": [],
        "differences": [],
        "suggested_trip_type": "",
        "confidence_level": "low/medium/high"
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
    console.error("Error matching travelers:", error);
    throw error;
  }
};
