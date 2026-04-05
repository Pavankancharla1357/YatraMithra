import { Type } from "@google/genai";
import { db } from "../firebase";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { getGeminiInstance } from "./gemini";

const getAi = () => {
  return getGeminiInstance();
};

export interface BuddyMatch {
  uid: string;
  name: string;
  photo_url: string | null;
  compatibilityScore: number;
  reasoning: string;
  commonInterests: string[];
}

export const getAiBuddyRecommendations = async (currentUserProfile: any): Promise<BuddyMatch[]> => {
  if (!currentUserProfile) return [];

  try {
    const ai = getAi();
    // 1. Fetch some potential buddies (excluding current user)
    // In a real app, we'd filter by location or other criteria first
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("uid", "!=", currentUserProfile.uid), limit(20));
    const snapshot = await getDocs(q);
    const potentialBuddies = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as any));

    if (potentialBuddies.length === 0) return [];

    // 2. Prepare data for Gemini
    const currentUserData = {
      name: currentUserProfile.name,
      interests: currentUserProfile.interests || [],
      travel_vibe: currentUserProfile.travel_vibe || "Not specified",
      bio: currentUserProfile.bio || "",
      location: `${currentUserProfile.location_city || ""}, ${currentUserProfile.location_country || ""}`
    };

    const potentialBuddiesData = potentialBuddies.map((b: any) => ({
      uid: b.uid,
      name: b.name,
      interests: b.interests || [],
      travel_vibe: b.travel_vibe || "Not specified",
      bio: b.bio || "",
      location: `${b.location_city || ""}, ${b.location_country || ""}`
    }));

    // 3. Call Gemini to rank and explain matches
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: `
        Analyze the following user profiles and find the best travel buddy matches for the current user.
        
        Current User:
        ${JSON.stringify(currentUserData, null, 2)}
        
        Potential Buddies:
        ${JSON.stringify(potentialBuddiesData, null, 2)}
        
        Return a JSON array of the top 3 matches. Each match should include:
        - uid: string
        - compatibilityScore: number (0-100)
        - reasoning: string (a short, friendly explanation of why they match)
        - commonInterests: string[] (list of shared interests or vibes)
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              uid: { type: Type.STRING },
              compatibilityScore: { type: Type.NUMBER },
              reasoning: { type: Type.STRING },
              commonInterests: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["uid", "compatibilityScore", "reasoning", "commonInterests"]
          }
        }
      }
    });

    const matches = JSON.parse(response.text);

    // 4. Enrich matches with profile info (photo, name)
    return matches.map((match: any) => {
      const fullProfile = potentialBuddies.find((b: any) => b.uid === match.uid);
      return {
        ...match,
        name: fullProfile?.name || "Traveler",
        photo_url: fullProfile?.photo_url || null
      };
    }).sort((a: any, b: any) => b.compatibilityScore - a.compatibilityScore);

  } catch (error) {
    console.error("Error getting AI buddy recommendations:", error);
    return [];
  }
};
