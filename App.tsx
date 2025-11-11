import React, { useState, useCallback } from 'react';
import { MindMapData, ActiveTab } from './types';
import { generateMindMap } from './services/geminiService';
import { MindMapView } from './components/MindMapView';

// A simple component for SVG icons to avoid clutter
const Icon = ({ path, className = 'w-6 h-6' }: { path: string; className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);

const App: React.FC = () => {
    const [inputText, setInputText] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [mindMapData, setMindMapData] = useState<MindMapData | null>(null);
    const [activeTab, setActiveTab] = useState<ActiveTab>('hierarchy');
    const [history, setHistory] = useState<{ topic: string; data: MindMapData }[]>([]);

    const handleGenerate = useCallback(async (topicToGenerate: string, isDrillDown = false) => {
        if (!topicToGenerate.trim()) {
            setError('Please enter some text to generate a mind map.');
            return;
        }

        if (isDrillDown && mindMapData) {
            setHistory(prev => [...prev, { topic: inputText, data: mindMapData }]);
        } else {
            setHistory([]);
        }
        
        setInputText(topicToGenerate);
        setIsLoading(true);
        setError(null);
        setMindMapData(null);

        try {
            const data = await generateMindMap(topicToGenerate);
            setMindMapData(data);
            setActiveTab('hierarchy');
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [inputText, mindMapData]);
    
    const handleSubtopicDrillDown = useCallback((subtopic: string) => {
        handleGenerate(subtopic, true);
    }, [handleGenerate]);
    
    const handleBack = useCallback(() => {
        if (history.length === 0) return;

        const lastState = history[history.length - 1];
        const newHistory = history.slice(0, -1);

        setInputText(lastState.topic);
        setMindMapData(lastState.data);
        setHistory(newHistory);
        setError(null);
    }, [history]);

    const handleClear = useCallback(() => {
        setInputText('');
        setMindMapData(null);
        setError(null);
        setIsLoading(false);
        setHistory([]);
    }, []);

    const renderContent = () => {
        if (!mindMapData) return null;

        switch (activeTab) {
            case 'hierarchy':
                return (
                    <div className="space-y-4 text-left p-4 sm:p-6">
                        <h3 className="text-2xl font-bold text-purple-300">{mindMapData.hierarchy.mainTopic}</h3>
                        <ul className="space-y-3 list-inside">
                            {mindMapData.hierarchy.subtopics.map((sub, index) => (
                                <li key={index} className="border-l-4 border-purple-400 pl-4 py-1">
                                    <strong className="text-white block">{sub.name}</strong>
                                    <p className="text-gray-300 text-sm">{sub.details}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                );
            case 'mindmap':
                return <MindMapView mermaidCode={mindMapData.mermaidGraph} onSubtopicClick={handleSubtopicDrillDown} mainTopic={mindMapData.hierarchy.mainTopic} />;
            case 'insights':
                return (
                     <div className="space-y-4 text-left p-4 sm:p-6">
                        <h3 className="text-2xl font-bold text-cyan-300">Key Insights</h3>
                        <ul className="space-y-2">
                            {mindMapData.insights.map((insight, index) => (
                                <li key={index} className="flex items-start">
                                    <Icon path="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="w-5 h-5 text-cyan-400 mr-3 mt-1 flex-shrink-0" />
                                    <span className="text-gray-200">{insight}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 text-white p-4 sm:p-8 flex flex-col items-center">
            <header className="text-center mb-8 animate-fade-in-down">
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-300">🧭 MindMap.AI</span>
                </h1>
                <p className="text-gray-300 mt-2 text-lg">Turn Chaos Into Clarity</p>
            </header>

            <main className="w-full max-w-4xl flex flex-col items-center space-y-8">
                <div className="w-full bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 shadow-2xl animate-fade-in-up">
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Paste your messy notes, brainstorms, or ideas here..."
                        className="w-full h-48 bg-transparent border-2 border-gray-500 rounded-lg p-4 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all duration-300 resize-none placeholder-gray-400"
                        disabled={isLoading}
                    />
                    <div className="flex flex-col sm:flex-row justify-between items-center mt-4 space-y-4 sm:space-y-0 sm:space-x-4">
                        <div className="flex-1 text-sm text-gray-400">
                           AI will analyze your text to create a structured mind map and insights.
                        </div>
                        <div className="flex space-x-4">
                            <button
                                onClick={handleClear}
                                disabled={isLoading}
                                className="px-5 py-2.5 rounded-lg bg-gray-600/50 hover:bg-gray-500/50 text-white font-semibold transition-all duration-300 disabled:opacity-50 flex items-center space-x-2"
                            >
                                <Icon path="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" className="w-5 h-5"/>
                                <span>Clear</span>
                            </button>
                            <button
                                onClick={() => handleGenerate(inputText)}
                                disabled={isLoading}
                                className="px-5 py-2.5 rounded-lg bg-purple-600 text-white font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-700 shadow-[0_0_15px_rgba(168,85,247,0.6)] hover:shadow-[0_0_25px_rgba(168,85,247,0.9)] flex items-center space-x-2"
                            >
                                {isLoading ? (
                                     <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : <Icon path="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.553L16.5 21.75l-.398-1.197a3.375 3.375 0 00-2.456-2.456L12.75 18l1.197-.398a3.375 3.375 0 002.456-2.456L16.5 14.25l.398 1.197a3.375 3.375 0 002.456 2.456l1.197.398-1.197.398a3.375 3.375 0 00-2.456 2.456z" className="w-5 h-5"/>}
                                <span>{isLoading ? 'Generating...' : 'Generate MindMap'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {error && <div className="w-full max-w-4xl bg-red-500/30 border border-red-500 text-red-200 px-4 py-3 rounded-lg animate-fade-in-up">{error}</div>}

                {mindMapData && (
                    <div className="w-full bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl animate-fade-in-up transition-all duration-500">
                        <div className="border-b border-white/20 px-4 pt-2 flex justify-between items-center">
                             <nav className="-mb-px flex space-x-6">
                                <TabButton icon="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" label="Hierarchy" tabName="hierarchy" activeTab={activeTab} setActiveTab={setActiveTab} />
                                <TabButton icon="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" label="MindMap" tabName="mindmap" activeTab={activeTab} setActiveTab={setActiveTab} />
                                <TabButton icon="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.355a7.5 7.5 0 01-7.5 0" label="Insights" tabName="insights" activeTab={activeTab} setActiveTab={setActiveTab} />
                            </nav>
                             {history.length > 0 && (
                                <button
                                    onClick={handleBack}
                                    className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-300 text-gray-300 hover:bg-white/10 hover:text-white"
                                    aria-label="Go back to previous mind map"
                                >
                                    <Icon path="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" className="w-5 h-5"/>
                                    <span className="hidden sm:inline">Back</span>
                                </button>
                            )}
                        </div>
                        <div className="min-h-[20rem] flex items-center justify-center overflow-hidden">
                           <div key={activeTab} className="w-full animate-fade-in-content">
                                {renderContent()}
                            </div>
                        </div>
                    </div>
                )}
            </main>
             <footer className="text-center mt-auto pt-10 text-gray-400 text-sm animate-fade-in-up">
                <p>Built at NERDS Vibeathon ‘25</p>
            </footer>
        </div>
    );
};

interface TabButtonProps {
    icon: string;
    label: string;
    tabName: ActiveTab;
    activeTab: ActiveTab;
    setActiveTab: (tab: ActiveTab) => void;
}

const TabButton: React.FC<TabButtonProps> = ({ icon, label, tabName, activeTab, setActiveTab }) => {
    const isActive = activeTab === tabName;
    return (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`flex items-center space-x-2 px-1 py-3 text-sm font-medium transition-colors duration-300 border-b-2 ${
                isActive
                    ? 'border-purple-400 text-purple-300'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
            }`}
        >
           <Icon path={icon} className="w-5 h-5"/>
           <span className="hidden sm:inline">{label}</span>
        </button>
    );
};


export default App;