import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export async function extractTextFromBase64(
  mimeType: string,
  base64DataUrl: string
): Promise<string> {
  try {
    // Extract base64 payload from data URL format if present
    const commaIndex = base64DataUrl.indexOf(",");
    const base64Payload =
      commaIndex !== -1
        ? base64DataUrl.substring(commaIndex + 1)
        : base64DataUrl;

    const buffer = Buffer.from(base64Payload, "base64");

    // Handle Plain Text & Markdown files
    if (
      mimeType === "text/plain" ||
      mimeType === "text/markdown" ||
      mimeType.startsWith("text/")
    ) {
      return buffer.toString("utf-8");
    }

    // Handle PDFs
    if (mimeType === "application/pdf") {
      const parsed = await (pdfParse as any)(buffer);
      return parsed.text || "";
    }

    // Handle Word Documents (DOCX)
    if (
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword"
    ) {
      const parsed = await mammoth.extractRawText({ buffer });
      return parsed.value || "";
    }

    return "";
  } catch (err: any) {
    console.error("Error extracting text from document:", err);
    throw new Error(`Failed to parse document text: ${err.message}`);
  }
}
