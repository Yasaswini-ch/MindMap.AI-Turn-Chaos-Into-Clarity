
export interface Subtopic {
    name: string;
    details: string;
}

export interface Hierarchy {
    mainTopic: string;
    subtopics: Subtopic[];
}

export interface MindMapData {
    hierarchy: Hierarchy;
    mermaidGraph: string;
    insights: string[];
}

export type ActiveTab = 'hierarchy' | 'mindmap' | 'insights';
