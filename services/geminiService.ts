import { GoogleGenAI, Type } from "@google/genai";
import { MindMapData } from "../types";

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        hierarchy: {
            type: Type.OBJECT,
            properties: {
                mainTopic: { type: Type.STRING, description: 'The central theme or main topic of the text.' },
                subtopics: {
                    type: Type.ARRAY,
                    description: 'A list of subtopics derived from the main topic.',
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING, description: 'The name of the subtopic.' },
                            details: { type: Type.STRING, description: 'A brief explanation or key point related to the subtopic.' }
                        },
                        required: ['name', 'details']
                    }
                }
            },
            required: ['mainTopic', 'subtopics']
        },
        mermaidGraph: {
            type: Type.STRING,
            description: 'A valid Mermaid.js graph string (using `graph TD` syntax) visualizing the hierarchy.'
        },
        insights: {
            type: Type.ARRAY,
            description: 'An array of 3-5 key insights or summaries from the text, as strings.',
            items: { type: Type.STRING }
        }
    },
    required: ['hierarchy', 'mermaidGraph', 'insights']
};

const mockMindMapData: MindMapData = {
  hierarchy: {
    mainTopic: 'Demo Mode: How to Bake a Cake',
    subtopics: [
      { name: 'Gather Ingredients', details: 'Flour, sugar, eggs, butter, baking powder.' },
      { name: 'Preheat Oven', details: 'Set to 350°F (175°C).' },
      { name: 'Mix Ingredients', details: 'Combine dry, then mix in wet ingredients.' },
      { name: 'Bake', details: 'Bake for 30-35 mins until golden brown.' },
    ],
  },
  mermaidGraph: `graph TD
    A["Demo: How to Bake a Cake"]
    A --> B["Gather Ingredients<br/>Flour, sugar, eggs, butter..."]
    A --> C["Preheat Oven<br/>Set to 350°F (175°C)"]
    A --> D["Mix Ingredients<br/>Combine dry, then mix in wet"]
    A --> E["Bake<br/>30-35 minutes until golden"]`,
  insights: [
    'This is a demonstration of what MindMap.AI can do.',
    'The app is currently running in an offline demo mode because no API key was found.',
    'To generate mind maps from your own text, configure the API_KEY environment variable in your deployment settings.',
  ],
  isDemo: true,
};

const getApiKey = (): string | null => {
    try {
        // 1. Try to get the key from the environment (most secure, for platforms that support it)
        const envKey = process.env.API_KEY;
        if (envKey) {
            return envKey;
        }
    } catch (e) {
        // process.env is not defined in a pure browser environment, so we ignore the error.
    }

    // 2. If not in env, check sessionStorage for a key saved during this session.
    const sessionKey = sessionStorage.getItem('gemini_api_key');
    if (sessionKey) {
        return sessionKey;
    }

    // 3. If it's not found anywhere, prompt the user for their key.
    const userKey = window.prompt(
        "API Key not found.\n\nPlease enter your Google Gemini API key to proceed.\n\nThis will be stored for your current session only."
    );

    if (userKey) {
        sessionStorage.setItem('gemini_api_key', userKey);
        return userKey;
    }

    // Return null if the user cancels the prompt.
    return null;
};


export async function generateMindMap(inputText: string): Promise<MindMapData> {
    const apiKey = getApiKey();

    if (!apiKey) {
        console.warn("API Key not provided by user. Returning mock data.");
        // Return mock data if the user cancels the prompt
        return new Promise(resolve => resolve(mockMindMapData));
    }
    
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
        Analyze the following unstructured text. Your task is to transform it into a structured mind map format.

        Text to Analyze:
        """
        ${inputText}
        """

        Instructions:
        1.  Identify the single main topic of the text.
        2.  Extract key ideas and group them into logical subtopics. For each subtopic, provide a brief detail.
        3.  Generate a concise summary of the most important insights from the text, presented as an array of 3-5 strings.
        4.  Create a Mermaid.js mind map diagram string representing the hierarchy. Use the \`graph TD\` (Top Down) syntax. The main topic is the root, connected to all subtopics.
            - **Syntax Rules:**
            - The entire output for this key must be a single string.
            - Start with \`graph TD\`.
            - Each statement (e.g., a node link) must be on a new line within the string, separated by the newline character '\\n'.
            - Define the main topic node, e.g., \`A["Main Topic"]\`.
            - For each subtopic, create a new node and link it from the main topic, e.g., \`A --> B["Subtopic Name"]\`.
            - To include details in a subtopic node, use a "<br/>" HTML tag for a line break inside the node's label, like this: \`B["Subtopic Name<br/>Details text here"]\`.
            - **CRITICAL:** If any text for a node label (main topic or subtopics) contains double quotes ("), they MUST be escaped as HTML entities, like \`&quot;\`, to prevent a syntax parsing error.

            - **Correct Example Structure:** \`graph TD\\nA["Main Topic"]\\nA --> B["Subtopic 1<br/>Detail 1"]\\nA --> C["Subtopic 2<br/>Detail 2 with &quot;quotes&quot;"]\`

        Respond ONLY with a single, valid JSON object that adheres to the provided schema. Do not add any text, markdown, or explanations before or after the JSON.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.2,
            },
        });

        const jsonText = response.text.trim();
        const data: MindMapData = JSON.parse(jsonText);
        
        if (!data.hierarchy || !data.mermaidGraph || !data.insights) {
            throw new Error("Invalid data structure received from AI.");
        }

        return data;

    } catch (error) {
        console.error("Error calling Gemini API:", error);
         if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID'))) {
             sessionStorage.removeItem('gemini_api_key');
             throw new Error("Your API key is not valid. It has been cleared. Please provide a valid key on your next attempt.");
        }
        throw new Error("Failed to generate mind map. The AI may be experiencing issues or the input is too complex. Please try again.");
    }
}

export async function getTopicElaboration(topic: string): Promise<string> {
    const apiKey = getApiKey();

    if (!apiKey) {
        // This can happen if the user generated a demo map, then tries to elaborate.
        if (topic.startsWith('Demo Mode:')) {
            return "This is a sample topic from the demo mode. To get real-time elaborations, please refresh and provide your API key to generate a live mind map.";
        }
        throw new Error("API Key is required to get more information. Please refresh and provide your key.");
    }
    
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `Provide a concise, one-paragraph elaboration on the following topic: "${topic}"`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        return response.text;

    } catch (error) {
        console.error("Error getting topic elaboration:", error);
         if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID'))) {
             sessionStorage.removeItem('gemini_api_key');
             throw new Error("Your API key is not valid. It has been cleared. Please provide a valid key on your next attempt.");
        }
        throw new Error("Failed to get more information. The AI may be experiencing issues.");
    }
}