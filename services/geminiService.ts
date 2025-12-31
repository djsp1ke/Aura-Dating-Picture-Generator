
import { GoogleGenAI } from "@google/genai";
import { ImageData } from "../types";

export const editImage = async (
  originalImage: ImageData,
  prompt: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: originalImage.base64.split(',')[1], // Extract pure base64
              mimeType: originalImage.mimeType,
            },
          },
          {
            text: `You are an expert dating profile consultant and photo editor. 
                   Task: ${prompt}. 
                   Instructions: Maintain the facial features and identity of the person perfectly. 
                   Enhance the aesthetics to be more appealing for a dating application. 
                   Do not make the edits look artificial. Return ONLY the edited image.`,
          },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }

    throw new Error("Model did not return an image part.");
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
