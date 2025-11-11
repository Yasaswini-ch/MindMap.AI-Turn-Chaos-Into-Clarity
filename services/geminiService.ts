import { GoogleGenAI, Type } from "@google/genai";
import { MindMapData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

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


export async function generateMindMap(inputText: string): Promise<MindMapData> {
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
        
        // Basic validation
        if (!data.hierarchy || !data.mermaidGraph || !data.insights) {
            throw new Error("Invalid data structure received from AI.");
        }

        return data;

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Failed to generate mind map. The AI may be experiencing issues or the input is too complex. Please try again.");
    }
}