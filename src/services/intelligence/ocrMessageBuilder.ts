import { extractTextFromImage } from "../../lib/ocrService";
import {
  addMessage,
  createMessageId,
  setActiveToolLabel,
  updateMessage,
} from "../../store/intelligenceStore";

export interface ImageAttachment {
  base64: string;
  fileName: string;
}

const DEFAULT_OCR_PROMPT =
  "Please extract all purchasable line items, quantities, extended line prices, adjustments (taxes, service charges, discounts), receipt total, merchant name, and date. Call propose_add_transactions with source: 'ocr', merchant, receipt_total, ocr_confidence, and all transaction drafts.";

export async function appendUserMessageWithOptionalOcr(
  model: string,
  trimmedText: string,
  attachment?: ImageAttachment,
): Promise<void> {
  const userMessageId = createMessageId();

  if (!attachment) {
    addMessage(model, {
      id: userMessageId,
      role: "user",
      content: trimmedText,
      createdAt: Date.now(),
    });
    return;
  }

  addMessage(model, {
    id: userMessageId,
    role: "user",
    content: trimmedText || `[Attached image: ${attachment.fileName}]`,
    imageBase64: attachment.base64,
    imageFileName: attachment.fileName,
    isOcrProcessing: true,
    createdAt: Date.now(),
  });

  setActiveToolLabel("Scanning image text (OCR)");

  let ocrText = "";
  let ocrConfidence = 0;
  try {
    const ocrResult = await extractTextFromImage(attachment.base64);
    ocrText = ocrResult.rawText;
    ocrConfidence = ocrResult.confidence;
  } catch (ocrErr) {
    console.warn("[OCR] Error extracting text:", ocrErr);
  } finally {
    setActiveToolLabel(null);
  }

  const confidenceLabel =
    ocrConfidence > 0 ? ` (OCR Confidence: ${Math.round(ocrConfidence)}%)` : "";
  const ocrSnippet = ocrText
    ? `[Uploaded Receipt / Image: ${attachment.fileName}${confidenceLabel}]\nExtracted Text (OCR):\n"""\n${ocrText}\n"""\n\n${
        trimmedText ? `User Note: ${trimmedText}` : DEFAULT_OCR_PROMPT
      }`
    : trimmedText ||
      `[Uploaded Image: ${attachment.fileName} - No text could be extracted. Please provide transaction details manually.]`;

  updateMessage(model, userMessageId, {
    isOcrProcessing: false,
    content: ocrSnippet,
  });
}
