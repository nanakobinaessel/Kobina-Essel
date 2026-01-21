
import { GoogleGenAI, Type } from "@google/genai";
// Fix: Import ROOMS instead of non-existent UCC_VENUES
import { ROOMS } from "../constants";

// Correctly initialize with process.env.API_KEY directly.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getSchedulingAdvice = async (userPrompt: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      // Fix: Use ROOMS and map fields that exist on the Room type (name, capacity, type, status)
      contents: `You are the UCC Campus Assistant. Help the user find a venue or answer questions about the University of Cape Coast venues. 
      Available venues at UCC: ${JSON.stringify(ROOMS.map(v => ({ name: v.name, capacity: v.capacity, type: v.type, status: v.status })))}.
      
      User query: ${userPrompt}`,
      config: {
        systemInstruction: "You are a friendly campus concierge for the University of Cape Coast. Be helpful, concise, and professional. If users ask for recommendations, suggest specific UCC halls based on their capacity and features.",
        temperature: 0.7,
      },
    });

    // Directly access the .text property from GenerateContentResponse
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm having trouble connecting to the campus neural network. Please try again later.";
  }
};

export const parseNaturalBooking = async (text: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      // Fix: Use ROOMS instead of non-existent UCC_VENUES
      contents: `Extract booking details from this text: "${text}". 
      Available venues: ${ROOMS.map(v => v.name).join(', ')}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            venueName: { type: Type.STRING },
            date: { type: Type.STRING },
            startTime: { type: Type.STRING },
            endTime: { type: Type.STRING },
            purpose: { type: Type.STRING },
            estimatedAttendance: { type: Type.NUMBER }
          }
        }
      }
    });
    
    // Directly access the .text property and ensure it's trimmed for JSON parsing.
    const jsonStr = (response.text || "").trim();
    return jsonStr ? JSON.parse(jsonStr) : null;
  } catch (error) {
    console.error("Parsing Error:", error);
    return null;
  }
};
