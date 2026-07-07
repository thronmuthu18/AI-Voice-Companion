import Message from "../models/Message.model";

export interface ActiveContext {
  latestImage?: { url: string; name: string };
  latestDocument?: { name: string; extractedText: string };
  latestAudio?: { url: string; name: string };
}

export class ContextService {
  // Scans history and current request attachments to find active conversation context
  async getActiveContext(chatId: string, requestAttachments?: any[]): Promise<ActiveContext> {
    let latestImage: any = null;
    let latestDocument: any = null;
    let latestAudio: any = null;

    // 1. Scan current request attachments first
    if (requestAttachments && requestAttachments.length > 0) {
      for (const att of requestAttachments) {
        if (att.mimeType?.startsWith("image/")) {
          latestImage = { url: att.url, name: att.name || "image.png" };
        } else if (
          att.mimeType?.startsWith("audio/") ||
          att.mimeType === "application/octet-stream" && att.name?.endsWith(".wav")
        ) {
          latestAudio = { url: att.url, name: att.name || "audio.wav" };
        } else if (att.extractedText) {
          latestDocument = { name: att.name || "document", extractedText: att.extractedText };
        }
      }
    }

    // 2. Scan DB history if any details are missing
    if (!latestImage || !latestDocument || !latestAudio) {
      const historyMessages = await Message.find({ chatId }).sort({ createdAt: -1 }).limit(15);
      for (const msg of historyMessages) {
        if (msg.attachments && msg.attachments.length > 0) {
          for (const att of msg.attachments) {
            if (att.mimeType?.startsWith("image/") && !latestImage) {
              latestImage = { url: att.url, name: att.name || "image.png" };
            } else if (
              (att.mimeType?.startsWith("audio/") ||
              att.mimeType === "application/octet-stream" && att.name?.endsWith(".wav")) &&
              !latestAudio
            ) {
              latestAudio = { url: att.url, name: att.name || "audio.wav" };
            } else if (att.extractedText && !latestDocument) {
              latestDocument = { name: att.name || "document", extractedText: att.extractedText };
            }
          }
        }
      }
    }

    return { latestImage, latestDocument, latestAudio };
  }

  // Resolves pronouns and references based on active conversation context
  resolveReferences(message: string, context: ActiveContext): string {
    const msg = message.toLowerCase().trim();
    let resolved = message;

    const hasIt = /\b(it|this|that|the last one|previous|again|same|the same one)\b/i.test(msg);
    const hasImageRef = /\b(image|photo|picture|logo|sketch|illustration|portrait|drawing|blue|red|green|black|white|color|background|sunglasses|dress|suit|chain|remove|add|replace)\b/i.test(msg);
    const hasDocRef = /\b(file|pdf|docx|doc|txt|csv|document|extracted text|text|translate|summarize|read|explain)\b/i.test(msg);
    const hasAudioRef = /\b(audio|speech|voice|wav|mp3|play|listen|hear|speak)\b/i.test(msg);

    // 1. Image reference resolution
    if (context.latestImage && (hasImageRef || (hasIt && !hasDocRef && !hasAudioRef))) {
      resolved = `${resolved} (Context Reference: targeting the image "${context.latestImage.name}")`;
    }
    // 2. Document reference resolution
    else if (context.latestDocument && (hasDocRef || (hasIt && !hasImageRef && !hasAudioRef))) {
      resolved = `${resolved} (Context Reference: targeting the document "${context.latestDocument.name}")`;
    }
    // 3. Audio reference resolution
    else if (context.latestAudio && (hasAudioRef || (hasIt && !hasImageRef && !hasDocRef))) {
      resolved = `${resolved} (Context Reference: targeting the audio "${context.latestAudio.name}")`;
    }

    return resolved;
  }
}

export const contextService = new ContextService();
