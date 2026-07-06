import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import fs from "fs";

export async function extractTextFromFile(
  mimeType: string,
  filePath: string
): Promise<string> {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist at path: ${filePath}`);
    }

    const buffer = fs.readFileSync(filePath);

    // Plain Text & Markdown
    if (
      mimeType === "text/plain" ||
      mimeType === "text/markdown" ||
      mimeType === "text/csv" ||
      mimeType.startsWith("text/")
    ) {
      return buffer.toString("utf-8");
    }

    // PDF
    if (mimeType === "application/pdf") {
      const parsed = await (pdfParse as any)(buffer);
      return parsed.text || "";
    }

    // DOCX (Word Document)
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
    console.error("Error extracting text from file path:", err);
    throw new Error(`Failed to parse document file text: ${err.message}`);
  }
}

export async function extractTextFromBase64(
  mimeType: string,
  base64DataUrl: string
): Promise<string> {
  try {
    const commaIndex = base64DataUrl.indexOf(",");
    const base64Payload =
      commaIndex !== -1
        ? base64DataUrl.substring(commaIndex + 1)
        : base64DataUrl;

    const buffer = Buffer.from(base64Payload, "base64");

    if (
      mimeType === "text/plain" ||
      mimeType === "text/markdown" ||
      mimeType.startsWith("text/")
    ) {
      return buffer.toString("utf-8");
    }

    if (mimeType === "application/pdf") {
      const parsed = await (pdfParse as any)(buffer);
      return parsed.text || "";
    }

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
    console.error("Error extracting text from base64:", err);
    throw new Error(`Failed to parse base64 document: ${err.message}`);
  }
}
