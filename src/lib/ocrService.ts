import { createWorker, type Worker } from "tesseract.js";

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker(["eng", "ind"], undefined, {
        logger: (m) => {
          if (import.meta.env.DEV && m.status === "recognizing text") {
            console.debug(`[OCR Progress] ${(m.progress * 100).toFixed(0)}%`);
          }
        },
      });
      return worker;
    })();
  }
  return workerPromise;
}

export interface OcrResult {
  rawText: string;
  confidence: number;
}

/**
 * Extracts text from an image File, Blob, or base64 data URL using Tesseract.js OCR.
 * Supports both Indonesian and English text recognition.
 */
export async function extractTextFromImage(
  imageSource: string | File | Blob,
): Promise<OcrResult> {
  try {
    const worker = await getWorker();
    const result = await worker.recognize(imageSource);
    return {
      rawText: (result.data.text || "").trim(),
      confidence: result.data.confidence || 0,
    };
  } catch (error) {
    console.error("[OCR Service] Failed to recognize text:", error);
    throw new Error(
      error instanceof Error
        ? `OCR failed: ${error.message}`
        : "Failed to extract text from image.",
    );
  }
}
