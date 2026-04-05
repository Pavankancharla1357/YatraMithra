import { Type, ThinkingLevel } from "@google/genai";
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { getGeminiInstance } from "./gemini";

const getAi = () => {
  return getGeminiInstance();
};

export interface ScannedDocument {
  type: string;
  confidence: number;
  summary: string;
  details: {
    name: string;
    from_location: string;
    to_location: string;
    departure_date: string;
    departure_time: string;
    arrival_date: string;
    arrival_time: string;
    booking_id: string;
    provider: string;
    address: string;
    id_number_masked: string;
    extra_info: string;
  };
}

export const scanTravelDocument = async (base64Data: string, mimeType: string, retries = 1): Promise<ScannedDocument> => {
  try {
    const ai = getAi();
    
    // Ensure we only have the base64 part
    const base64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

    const prompt = `You are a travel document expert. Analyze the provided ${mimeType} carefully.
Extract all relevant travel information including flight details, hotel bookings, train tickets, or identification documents.
Provide a concise summary of the document (e.g., "Flight from NYC to London on March 25th").
Fill in all details you can find. Mask sensitive ID numbers like passport or license numbers, showing only the last 4 digits (e.g., XXXX5678).`;

    console.log(`Scanning document with model: gemini-flash-latest, mimeType: ${mimeType}, attempt: ${2 - retries}`);
    
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64,
                mimeType: mimeType
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            details: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                from_location: { type: Type.STRING },
                to_location: { type: Type.STRING },
                departure_date: { type: Type.STRING },
                departure_time: { type: Type.STRING },
                arrival_date: { type: Type.STRING },
                arrival_time: { type: Type.STRING },
                booking_id: { type: Type.STRING },
                provider: { type: Type.STRING },
                address: { type: Type.STRING },
                id_number_masked: { type: Type.STRING },
                extra_info: { type: Type.STRING }
              }
            }
          },
          required: ["type", "confidence", "summary"]
        }
      }
    });

    if (!response.text) {
      throw new Error("AI returned an empty response");
    }

    try {
      const parsed = JSON.parse(response.text);
      return {
        type: parsed.type || "Other",
        confidence: parsed.confidence || 0,
        summary: parsed.summary || "No summary available",
        details: parsed.details || {}
      };
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", response.text);
      throw new Error("The AI returned an invalid response format. Please try again.");
    }
  } catch (error: any) {
    console.error("Scan Error:", error);
    
    // If it's a 429 (Rate Limit) and we have retries left, wait and try again
    if (retries > 0 && (error?.message?.includes('429') || error?.message?.includes('quota'))) {
      console.log('Rate limit hit, retrying in 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return scanTravelDocument(base64Data, mimeType, retries - 1);
    }
    
    throw error;
  }
};

export const saveScannedDocument = async (userId: string, doc: ScannedDocument, imageUrl?: string) => {
  try {
    const docData = {
      user_id: userId,
      type: doc.type,
      confidence: doc.confidence,
      summary: doc.summary,
      details: doc.details,
      image_url: imageUrl || "",
      created_at: new Date().toISOString()
    };
    
    const docRef = await addDoc(collection(db, `users/${userId}/documents`), docData);
    return docRef.id;
  } catch (error) {
    console.error("Error saving document:", error);
    throw error;
  }
};

export const getUserDocuments = async (userId: string) => {
  try {
    const q = query(
      collection(db, `users/${userId}/documents`),
      orderBy("created_at", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
  } catch (error) {
    console.error("Error fetching documents:", error);
    return [];
  }
};
