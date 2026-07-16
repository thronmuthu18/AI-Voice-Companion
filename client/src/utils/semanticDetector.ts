export type DetectedLang = "English" | "Tamil" | "Tanglish" | "Mixed";

export interface TurnAnalysis {
  detectedLanguage: DetectedLang;
  isComplete: boolean;
  confidence: number;
  adaptiveTimeout: number;
}

export function detectSpeechLanguage(text: string): DetectedLang {
  const tamilChars = text.match(/[\u0B80-\u0BFF]/g);
  const tamilCount = tamilChars ? tamilChars.length : 0;

  if (tamilCount > 2) {
    const englishWords = text.match(/[a-zA-Z]+/g);
    if (englishWords && englishWords.length > 2) {
      return "Mixed";
    }
    return "Tamil";
  }

  // Tanglish phonetic patterns (Tamil words written in English letters)
  const tanglishPatterns = /\b(yenna|enna|panna|irukku|varuthu|romba|nalla|solla|solli|pannitu|irukken|epdi|eppadi|sapadu|nanri|vanakkam|bro|pro|varala|pannunga|panunga|theriyum|theriyathu|illai|illa|irukku|iruku|pinnadi|munnadi|kulla|kooda|apdi|epdi|iruken|solunga|pannunga|romba|nallathu|varum|kitta)\b/i;
  if (tanglishPatterns.test(text)) {
    return "Tanglish";
  }

  return "English";
}

export function normalizeTamilSpeech(text: string): string {
  // Clear repeated punctuation and normalize whitespace
  let cleanText = text
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, " ")
    .replace(/\s+/g, " ");

  // Normalize Unicode sequences to standard form NFC
  cleanText = cleanText.normalize("NFC");

  // Keep technical terms exactly as they are
  const techTerms = [
    "React",
    "Node.js",
    "Node",
    "MongoDB",
    "Express",
    "ChatGPT",
    "Gemini",
    "Vite",
    "Next.js",
    "Next",
    "API",
    "JWT",
  ];

  for (const term of techTerms) {
    const regex = new RegExp(`\\b${term}\\b`, "gi");
    cleanText = cleanText.replace(regex, term);
  }

  return cleanText.trim();
}

export function analyzeSemanticTurn(text: string): TurnAnalysis {
  const clean = text.trim();
  if (!clean) {
    return {
      detectedLanguage: "English",
      isComplete: false,
      confidence: 0,
      adaptiveTimeout: 2000,
    };
  }

  const lang = detectSpeechLanguage(clean);
  const lowercase = clean.toLowerCase();

  let isComplete = true;
  let confidence = 0.9;
  let adaptiveTimeout = 1000; // default for short question/statement

  if (lang === "English") {
    // English connecting words indicating speech is incomplete
    const incompletePatterns = /\b(and|but|or|so|because|if|when|then|also|like|with|about|for|although|though|while|to|is|are|was|were|have|has|had|want|need|wants|needs|how|what|why|who|help|create|generate|explain|describe)\s*$/i;
    const isConnecting = incompletePatterns.test(lowercase);
    const hasUnfinishedPhrase = /\b(i want to|i need to|how to|what is|can you|could you|machine learning is|react component is|i think|i believe|please tell me|tell me about|explain to me|show me how|i am trying to)\s*$/i.test(lowercase);

    if (isConnecting || hasUnfinishedPhrase) {
      isComplete = false;
      confidence = 0.95;
      adaptiveTimeout = 2500; // keep listening
    } else {
      // Long explanation check
      const wordCount = clean.split(/\s+/).length;
      if (wordCount > 10) {
        adaptiveTimeout = 2000; // long explanation silence threshold
      }
    }
  } else if (lang === "Tamil") {
    // Tamil incomplete suffixes and connective particles
    const incompletePatterns = /(மற்றும்|ஆனால்|அப்புறம்|அதுக்கப்புறம்|அதனால்|எனக்கு|எப்படி|என்ன|எதுக்கு|ஏன்னா|பற்றி|வந்து|அப்படின்னா|அதாவது|இல்லாட்டி|இருந்தா|சொல்லி|சொல்லிட்டு|பண்ணி|பண்ணிட்டு|வேண்டும் என்று|என்று|ன்னு|கூட|பத்தி|இருந்து)\s*$/;
    const isConnecting = incompletePatterns.test(clean);
    const hasUnfinishedPhrase = /(எனக்கு தெரிஞ்சிக்கணும்|மெஷின் லேர்னிங் என்பது|ரியாக்ட் காம்போனன்ட் என்பது|எப்படி பண்ணுறதுன்னு|என்ன செய்யணும்னு)\s*$/.test(clean);

    if (isConnecting || hasUnfinishedPhrase) {
      isComplete = false;
      confidence = 0.95;
      adaptiveTimeout = 3000; // keep listening longer for Tamil connective endings
    } else {
      const charCount = clean.length;
      if (charCount > 30) {
        adaptiveTimeout = 2200; // long Tamil explanation
      }
    }
  } else {
    // Tanglish or Mixed Tamil-English
    const incompletePatterns = /\b(and|but|or|so|because|if|when|apram|adhukkuapram|aprom|enna|yenna|solla|solli|panna|pannitu|irukka|irukku|yenna|bro|pro|kooda|apdi|epdi|solunga|varum|kitta|nu)\s*$/i;
    const isConnecting = incompletePatterns.test(lowercase);
    const hasUnfinishedPhrase = /\b(enakku theriyanum|react component epdi|node server epdi|mongodb connect epdi|explain pannunga)\s*$/i.test(lowercase);

    if (isConnecting || hasUnfinishedPhrase) {
      isComplete = false;
      confidence = 0.92;
      adaptiveTimeout = 2600; // keep listening
    } else {
      const wordCount = clean.split(/\s+/).length;
      if (wordCount > 8) {
        adaptiveTimeout = 2000; // long mixed statement
      }
    }
  }

  return {
    detectedLanguage: lang,
    isComplete,
    confidence,
    adaptiveTimeout,
  };
}
