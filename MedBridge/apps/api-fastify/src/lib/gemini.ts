import { VertexAI } from "@google-cloud/vertexai";

let cached: VertexAI | null = null;

function getVertexAi() {
  if (!cached) {
    const project = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1";
    if (!project) {
      throw new Error("Missing GOOGLE_CLOUD_PROJECT (required for Gemini via Vertex AI).");
    }
    cached = new VertexAI({ project, location });
  }
  return cached;
}

export async function summarizeForClinician(rawText: string) {
  // MVP optional: we keep this behind an env flag to avoid accidental medical outputs.
  if (process.env.GEMINI_ENABLED !== "true") return null;

  const vertex = getVertexAi();
  const modelName = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";
  const model = vertex.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 256,
    },
  });

  const prompt = [
    "You are summarizing patient-provided and OCR-extracted text for a clinician.",
    "Rules:",
    "- Do NOT infer diagnosis or disease candidates.",
    "- Do NOT provide medical advice.",
    "- Only compress/structure what is explicitly stated.",
    "- Output in Korean.",
    "",
    "TEXT:",
    rawText,
  ].join("\n");

  const resp = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return resp.response.candidates?.[0]?.content?.parts?.map((p) => ("text" in p ? p.text : "")).join("")?.trim() ?? null;
}


