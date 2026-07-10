declare module '@google/genai' {
  export class GoogleGenAI {
    constructor(config: { apiKey?: string });
    models: {
      generateContent(params: {
        model: string;
        contents: any[];
      }): Promise<{ text: string }>;
    };
  }
}
