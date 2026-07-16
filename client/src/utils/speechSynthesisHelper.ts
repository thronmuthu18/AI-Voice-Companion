export type DetectedVoiceLang = "en-US" | "ta-IN";

export function detectDominantLanguage(text: string): DetectedVoiceLang {
  const tamilChars = text.match(/[\u0B80-\u0BFF]/g);
  return tamilChars && tamilChars.length > 1 ? "ta-IN" : "en-US";
}

export function cleanSpeechText(text: string): string {
  let cleaned = text;

  // 1. Remove code blocks
  cleaned = cleaned.replace(/```[\s\S]*?```/g, " ");

  // 2. Remove inline code
  cleaned = cleaned.replace(/`[^`]*`/g, " ");

  // 3. Remove Markdown links like [label](url) -> keep only label
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // 4. Remove standalone URLs
  cleaned = cleaned.replace(/\bhttps?:\/\/\S+/gi, " ");

  // 5. Remove HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, " ");

  // 6. Remove Markdown headings, stars, underscores, bold/italic symbols
  cleaned = cleaned.replace(/[*_#~`\-+>]/g, " ");

  // 7. Remove bracket reference numbers e.g. [1], [12]
  cleaned = cleaned.replace(/\[\d+\]/g, " ");

  // 8. Remove emoji-only noise
  cleaned = cleaned.replace(/[\u1F600-\u1F64F\u1F300-\u1F5FF\u1F680-\u1F6FF\u2600-\u26FF\u2700-\u27BF]/gu, " ");

  // 9. Normalize multiple punctuations (e.g. !!! -> !, ... -> ., ??? -> ?)
  cleaned = cleaned.replace(/([.!?])\1+/g, "$1");

  // 10. Normalize duplicate spaces
  cleaned = cleaned.replace(/\s+/g, " ");

  // Preserve key technical abbreviations in normalized capitalization
  const techTerms = [
    { regex: /\bnode\.?js\b/gi, replacement: "Node.js" },
    { regex: /\bexpress\.?js\b/gi, replacement: "Express.js" },
    { regex: /\breact\.?js\b/gi, replacement: "React.js" },
    { regex: /\breact\b/gi, replacement: "React" },
    { regex: /\bmongodb\b/gi, replacement: "MongoDB" },
    { regex: /\bpython\b/gi, replacement: "Python" },
    { regex: /\bjavascript\b/gi, replacement: "JavaScript" },
    { regex: /\bapi\b/gi, replacement: "API" },
    { regex: /\bjson\b/gi, replacement: "JSON" },
    { regex: /\bhttp\b/gi, replacement: "HTTP" },
    { regex: /\bhttps\b/gi, replacement: "HTTPS" }
  ];

  for (const term of techTerms) {
    cleaned = cleaned.replace(term.regex, term.replacement);
  }

  return cleaned.trim();
}

export function splitSentences(text: string, isLast = false, textBufferRef?: { current: string }): string[] {
  let temp = text;

  // Mask special abbreviations, versions, and decimal points to avoid incorrect cuts
  const restoredValues: { [key: string]: string[] } = {
    "___NODE_JS___": [],
    "___EXPRESS_JS___": [],
    "___REACT_JS___": [],
    "___VERSION_NUM___": [],
    "___DECIMAL_NUM___": []
  };

  temp = temp.replace(/\bNode\.js\b/gi, (match) => {
    restoredValues["___NODE_JS___"].push(match);
    return "___NODE_JS___";
  });
  temp = temp.replace(/\bExpress\.js\b/gi, (match) => {
    restoredValues["___EXPRESS_JS___"].push(match);
    return "___EXPRESS_JS___";
  });
  temp = temp.replace(/\bReact\.js\b/gi, (match) => {
    restoredValues["___REACT_JS___"].push(match);
    return "___REACT_JS___";
  });
  temp = temp.replace(/\bv\d+\.\d+\.\d+\b/gi, (match) => {
    restoredValues["___VERSION_NUM___"].push(match);
    return "___VERSION_NUM___";
  });
  temp = temp.replace(/\b\d+\.\d+\b/gi, (match) => {
    restoredValues["___DECIMAL_NUM___"].push(match);
    return "___DECIMAL_NUM___";
  });

  // Split on sentence finalizers followed by whitespace
  const parts = temp.split(/(?<=[.?!。！？\n])\s+/);

  const sentences: string[] = [];
  let buffer = "";

  for (let i = 0; i < parts.length; i++) {
    let part = parts[i].trim();
    if (!part) continue;

    // Restore masked terms
    for (const key of Object.keys(restoredValues)) {
      const vals = restoredValues[key];
      let valIdx = 0;
      while (part.includes(key) && valIdx < vals.length) {
        part = part.replace(key, vals[valIdx++]);
      }
    }

    const isTamilSpeech = /[\u0B80-\u0BFF]/.test(part);

    // If it is the trailing item and stream is not finished, hold incomplete string
    if (!isLast && i === parts.length - 1) {
      const endsWithPunct = /[.?!。！？\n]$/.test(part);

      if (!endsWithPunct && isTamilSpeech && part.length > 70) {
        const words = part.split(/\s+/);
        if (words.length > 4) {
          const lastWord = words.pop() || "";
          const completePhrase = words.join(" ");
          const phraseToPush = buffer ? buffer + " " + completePhrase : completePhrase;
          sentences.push(phraseToPush);
          buffer = "";

          if (textBufferRef) {
            textBufferRef.current = lastWord;
          }
          break;
        }
      }

      if (!endsWithPunct) {
        if (textBufferRef) {
          textBufferRef.current = (buffer ? buffer + " " : "") + part;
        }
        return sentences;
      }
    }

    if (buffer) {
      part = buffer + " " + part;
      buffer = "";
    }

    // Hold small fragments (< 15 characters) to prevent robotic stuttering
    if (!isLast && part.length < 15 && i < parts.length - 1) {
      buffer = part;
    } else {
      sentences.push(part);
    }
  }

  if (buffer) {
    if (isLast) {
      sentences.push(buffer);
    } else if (textBufferRef) {
      textBufferRef.current = buffer;
    }
  }

  return sentences;
}

export function selectBestSystemVoice(langCode: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;

  const voices = window.speechSynthesis.getVoices();
  const isTamil = langCode.startsWith("ta");

  if (isTamil) {
    // 1. Native Tamil
    const nativeTamil = voices.find(v => v.lang.startsWith("ta") && v.localService && !v.name.toLowerCase().includes("google"));
    if (nativeTamil) return nativeTamil;

    // 2. Google Tamil
    const googleTamil = voices.find(v => v.lang.startsWith("ta") && v.name.toLowerCase().includes("google"));
    if (googleTamil) return googleTamil;

    // 3. Microsoft Tamil
    const msTamil = voices.find(v => v.lang.startsWith("ta") && v.name.toLowerCase().includes("microsoft"));
    if (msTamil) return msTamil;

    // 4. System Tamil
    const systemTamil = voices.find(v => v.lang.startsWith("ta"));
    if (systemTamil) return systemTamil;
  } else {
    // English Voice Priority: Natural -> Google -> Microsoft -> standard first match
    const englishVoices = voices.filter(v => v.lang.startsWith("en"));

    const naturalEn = englishVoices.find(v => v.name.toLowerCase().includes("natural"));
    if (naturalEn) return naturalEn;

    const googleEn = englishVoices.find(v => v.name.toLowerCase().includes("google"));
    if (googleEn) return googleEn;

    const msEn = englishVoices.find(v => v.name.toLowerCase().includes("microsoft"));
    if (msEn) return msEn;

    if (englishVoices.length > 0) return englishVoices[0];
  }

  return null;
}

export function calculateAdaptivePause(text: string): number {
  const clean = text.trim();
  if (!clean) return 100;

  const isParagraphBreak = clean.endsWith("\n") || clean.endsWith("\n\n");
  if (isParagraphBreak) {
    return 800; // longer transition pause for paragraphs
  }

  const wordCount = clean.split(/\s+/).length;
  if (wordCount < 6) {
    return 200; // short statement pause
  } else if (wordCount < 15) {
    return 400; // standard sentence pause
  }
  return 600; // long explanation pause
}
