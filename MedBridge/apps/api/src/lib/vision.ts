import { ImageAnnotatorClient } from "@google-cloud/vision";

let cached: ImageAnnotatorClient | null = null;

export function getVisionClient() {
  if (!cached) cached = new ImageAnnotatorClient();
  return cached;
}

export async function ocrTextFromImageBytes(imageBytes: Buffer) {
  const client = getVisionClient();
  const [result] = await client.textDetection({
    image: { content: imageBytes },
  });

  const text = result.fullTextAnnotation?.text ?? result.textAnnotations?.[0]?.description ?? "";
  return {
    text,
    // Cloud Vision doesn't provide a simple per-document confidence for textDetection in a stable shape.
    // Keep null for MVP; we can improve with Document AI/structured OCR later if needed.
    overallConfidence: null as number | null,
  };
}


