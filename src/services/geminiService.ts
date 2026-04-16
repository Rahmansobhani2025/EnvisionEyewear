import { GoogleGenAI, Type } from "@google/genai";
import { getInventory, type Eyeglass } from "../lib/supabase";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface FrameRecommendation {
  name: string;
  model: string;
  imageUrl: string;
  scientificRationale: string;
  frameStyle?: string;
  frameColor?: string;
  matchScore?: number;
  frontSize?: number;
  bridgeSize?: number;
  templeLength?: number;
  frameMaterial?: string;
  brandName?: string;
  price?: number;
  discountedPrice?: number;
}

export interface AnalysisResults {
  measurements: {
    ipd: number;
    ipd_mm?: number; // Added for compatibility
    bridgeWidth: number;
    faceWidth: number;
    templeLength: number;
  };
  faceGeometry: string;
  face_shape?: string; // Added for compatibility
  scientificRationale: {
    ipd: string;
    bridge: string;
    geometry: string;
  };
  styleProfile: {
    aesthetic: string;
    recommendations: string;
  };
  psychologicalProfile: {
    traits: string[];
    purchaseBehavior: string;
    guidance: string;
  };
  specialFeatures: string[];
  frameRecommendations: FrameRecommendation[];
}

export async function analyzeFace(imageBase64: string): Promise<AnalysisResults> {
  const results = await analyzeFaceScan([imageBase64]);
  // Map fields for compatibility with the new App.tsx
  return {
    ...results,
    face_shape: results.faceGeometry,
    measurements: {
      ...results.measurements,
      ipd_mm: results.measurements.ipd
    }
  };
}

export async function analyzeFaceScan(imagesBase64: string[], refinementText?: string): Promise<AnalysisResults> {
  const inventory = await getInventory();
  const inventoryContext = inventory.length > 0 
    ? `Available Inventory (JSON): ${JSON.stringify(inventory.map(i => ({ 
        id: i.id, 
        name: i.name, 
        model: i.model, 
        suitable_face_shapes: i.suitable_face_shapes, 
        bridge_width: i.bridge_width, 
        lens_width: i.lens_width,
        temple_length: i.temple_length,
        image_url: i.image_url 
      })))}`
    : "No inventory data available. Please provide generic recommendations based on common frame styles.";

  const refinementPrompt = refinementText 
    ? `\n\nUSER PREFERENCES FOR REFINEMENT: The user has expressed the following preferences: "${refinementText}". Please prioritize these preferences when selecting frames from the inventory and explaining the rationale.`
    : "";

  const prompt = `
    Analyze these 3 images of a person's face (Center, Right profile, Left profile) for optical fitting.
    
    Perform a scientific analysis for eyeglass fitting:
    1. Estimate Pupillary Distance (IPD) in mm.
    2. Estimate Bridge Width in mm.
    3. Estimate Face Width in mm.
    4. Estimate Temple Length in mm.
    5. Identify Face Geometry (e.g., Oval, Heart, Square, etc.).
    6. Provide scientific rationales for these measurements.
    7. Analyze the person's style and aesthetic profile.
    8. Identify any special facial features that affect eyeglass choice (e.g., high cheekbones, low bridge, prominent brow).
    9. Based on facial expressions and features, provide a psychological profile that might affect purchase behavior (e.g., decisive, meticulous, trend-oriented).
    10. Provide scientific guidance on how to help this person make a suitable purchase.
    11. Recommend minimum 3 and maximum 5 suitable eyeglass frame styles FROM THE PROVIDED INVENTORY. 
    
    ${inventoryContext}${refinementPrompt}

    For each recommendation, provide:
    - The name and model EXACTLY as they appear in the inventory.
    - The imageUrl EXACTLY as it appears in the image_url field of the inventory.
    - A scientific rationale explaining why this specific frame is suitable based on the person's facial biometrics and geometry, referencing the frame's dimensions (like bridge width) if available.
    - Additional details if available in the inventory or inferred: frameStyle, frameColor, matchScore (0-100), frontSize, bridgeSize, templeLength, frameMaterial, brandName, price, discountedPrice.

    IMPORTANT: 
    - Use purely scientific, objective language. 
    - No salesy or persuasive language.
    - If a measurement is an estimate, state it clearly in the rationale.
    - Return the data in the specified JSON format.
  `;

  const imageParts = imagesBase64.map(base64 => ({
    inlineData: {
      mimeType: "image/jpeg",
      data: base64,
    },
  }));

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          ...imageParts,
          { text: prompt },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          measurements: {
            type: Type.OBJECT,
            properties: {
              ipd: { type: Type.NUMBER },
              bridgeWidth: { type: Type.NUMBER },
              faceWidth: { type: Type.NUMBER },
              templeLength: { type: Type.NUMBER },
            },
            required: ["ipd", "bridgeWidth", "faceWidth", "templeLength"],
          },
          faceGeometry: { type: Type.STRING },
          scientificRationale: {
            type: Type.OBJECT,
            properties: {
              ipd: { type: Type.STRING },
              bridge: { type: Type.STRING },
              geometry: { type: Type.STRING },
            },
            required: ["ipd", "bridge", "geometry"],
          },
          styleProfile: {
            type: Type.OBJECT,
            properties: {
              aesthetic: { type: Type.STRING },
              recommendations: { type: Type.STRING },
            },
            required: ["aesthetic", "recommendations"],
          },
          psychologicalProfile: {
            type: Type.OBJECT,
            properties: {
              traits: { type: Type.ARRAY, items: { type: Type.STRING } },
              purchaseBehavior: { type: Type.STRING },
              guidance: { type: Type.STRING },
            },
            required: ["traits", "purchaseBehavior", "guidance"],
          },
          specialFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
          frameRecommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                model: { type: Type.STRING },
                imageUrl: { type: Type.STRING },
                scientificRationale: { type: Type.STRING },
                frameStyle: { type: Type.STRING },
                frameColor: { type: Type.STRING },
                matchScore: { type: Type.NUMBER },
                frontSize: { type: Type.NUMBER },
                bridgeSize: { type: Type.NUMBER },
                templeLength: { type: Type.NUMBER },
                frameMaterial: { type: Type.STRING },
                brandName: { type: Type.STRING },
                price: { type: Type.NUMBER },
                discountedPrice: { type: Type.NUMBER },
              },
              required: ["name", "model", "imageUrl", "scientificRationale"],
            },
          },
        },
        required: ["measurements", "faceGeometry", "scientificRationale", "styleProfile", "psychologicalProfile", "specialFeatures", "frameRecommendations"],
      },
    },
  });

  return JSON.parse(response.text);
}
