import { ImageAnnotatorClient } from '@google-cloud/vision';

let cached: ImageAnnotatorClient | null = null;

export function getVisionClient() {
  if (!cached) cached = new ImageAnnotatorClient();
  return cached;
}

export interface TextBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextAnnotation {
  text: string;
  boundingBox: TextBoundingBox;
}

export interface OcrResult {
  text: string;
  overallConfidence: number | null;
  textAnnotations: TextAnnotation[];
}

export async function ocrTextFromImageBytes(imageBytes: Buffer): Promise<OcrResult> {
  const client = getVisionClient();
  const [result] = await client.textDetection({
    image: { content: imageBytes },
  });

  const text =
    result.fullTextAnnotation?.text ??
    result.textAnnotations?.[0]?.description ??
    '';

  // 텍스트 annotations에서 bounding box 정보 추출
  const textAnnotations: TextAnnotation[] = [];
  if (result.textAnnotations && result.textAnnotations.length > 0) {
    // 첫 번째는 전체 텍스트이므로 제외
    for (let i = 1; i < result.textAnnotations.length; i++) {
      const annotation = result.textAnnotations[i];
      const boundingPoly = annotation.boundingPoly;
      
      if (boundingPoly?.vertices && boundingPoly.vertices.length >= 2) {
        // boundingPoly의 vertices에서 최소/최대 좌표 계산
        const xs = boundingPoly.vertices.map((v) => v.x ?? 0);
        const ys = boundingPoly.vertices.map((v) => v.y ?? 0);
        
        const x = Math.min(...xs);
        const y = Math.min(...ys);
        const width = Math.max(...xs) - x;
        const height = Math.max(...ys) - y;
        
        if (annotation.description) {
          textAnnotations.push({
            text: annotation.description,
            boundingBox: { x, y, width, height },
          });
        }
      }
    }
  }

  return {
    text,
    // MVP: keep null; structured confidence comes later.
    overallConfidence: null as number | null,
    textAnnotations, // bounding box 정보 포함
  };
}
