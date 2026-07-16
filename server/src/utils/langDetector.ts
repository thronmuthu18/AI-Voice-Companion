export type DetectedLang = "English" | "Tamil" | "Tanglish" | "Mixed";

export function detectLanguage(text: string): DetectedLang {
  const tamilChars = text.match(/[\u0B80-\u0BFF]/g);
  const tamilCount = tamilChars ? tamilChars.length : 0;
  
  if (tamilCount > 2) {
    const englishWords = text.match(/[a-zA-Z]+/g);
    // If there is significant English vocabulary alongside Tamil Unicode characters, call it Mixed
    if (englishWords && englishWords.length > 3) {
      return "Mixed";
    }
    return "Tamil";
  }
  
  // Tanglish phonetic patterns (Tamil transcribed in Latin script)
  const tanglishPatterns = /\b(yenna|enna|panna|irukku|varuthu|romba|nalla|solla|solli|pannitu|irukken|epdi|eppadi|sapadu|nanri|vanakkam|bro|pro|varala|pannunga|panunga|theriyum|theriyathu|illai|illa|irukku|iruku|pinnadi|munnadi)\b/i;
  if (tanglishPatterns.test(text)) {
    return "Tanglish";
  }
  
  return "English";
}
