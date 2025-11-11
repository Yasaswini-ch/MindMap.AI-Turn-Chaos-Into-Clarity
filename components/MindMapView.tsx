import React, { useEffect, useRef, useState, WheelEvent, MouseEvent, useCallback } from 'react';

// Make mermaid available globally for the script to work
declare const mermaid: any;

const MIN_SCALE = 0.2;
const MAX_SCALE = 4;

const Icon = ({ path, className = 'w-5 h-5' }: { path: string; className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);

interface MindMapViewProps {
    mermaidCode: string;
    onSubtopicClick: (subtopic: string) => void;
    onMainTopicClick: (topic: string) => void;
    mainTopic: string;
}

export const MindMapView: React.FC<MindMapViewProps> = ({ mermaidCode, onSubtopicClick, onMainTopicClick, mainTopic }) => {
    const svgContainerRef = useRef<HTMLDivElement>(null);
    const panWrapperRef = useRef<HTMLDivElement>(null);
    const panStartRef = useRef({ x: 0, y: 0 });

    const [isRendering, setIsRendering] = useState(true);
    const [isPanning, setIsPanning] = useState(false);
    const [showExportOptions, setShowExportOptions] = useState(false);
    const [view, setView] = useState({ scale: 1, x: 0, y: 0 });

    const centerView = useCallback(() => {
        if (svgContainerRef.current && panWrapperRef.current) {
            const svgElement = svgContainerRef.current.querySelector('svg');
            if (svgElement) {
                const { width, height } = svgElement.getBoundingClientRect();
                const { width: wrapperWidth, height: wrapperHeight } = panWrapperRef.current.getBoundingClientRect();
                setView({
                    scale: 1,
                    x: (wrapperWidth - width) / 2,
                    y: (wrapperHeight - height) / 2,
                });
            }
        }
    }, []);

    // Render Mermaid diagram and center it
    useEffect(() => {
        if (mermaidCode && svgContainerRef.current) {
            setIsRendering(true);
            setView({ scale: 1, x: 0, y: 0 }); // Reset view state before rendering
            try {
                const uniqueId = `mermaid-graph-${Date.now()}`;
                mermaid.render(uniqueId, mermaidCode)
                    .then(({ svg }: { svg: string }) => {
                        if (svgContainerRef.current) {
                           svgContainerRef.current.innerHTML = svg;
                           
                            // Add click handlers for drill-down and elaboration functionality
                           const nodes = svgContainerRef.current.querySelectorAll('.node');
                           
                           nodes.forEach((node) => {
                                const svgNode = node as SVGElement;
                                const label = svgNode.textContent;
                                
                                if (label) {
                                    // The label contains "Name\nDetails", we just want the name
                                    const nodeTopic = label.split(/<br\s*\/?>/)[0].trim();

                                    if (nodeTopic) {
                                        svgNode.style.cursor = 'pointer';
                                        
                                        if (nodeTopic === mainTopic) {
                                            // Main topic gets the "know more" modal
                                            svgNode.setAttribute('title', 'Click to learn more about this topic');
                                            svgNode.addEventListener('click', () => {
                                                onMainTopicClick(nodeTopic);
                                            });
                                        } else {
                                            // Subtopics get the drill-down functionality
                                            svgNode.setAttribute('title', 'Click to expand this topic');
                                            svgNode.addEventListener('click', () => {
                                                onSubtopicClick(nodeTopic);
                                            });
                                        }
                                    }
                                }
                           });

                           // Defer centering to ensure SVG has been painted and has dimensions
                           setTimeout(centerView, 0);
                        }
                    })
                    .catch((err: any) => {
                         console.error('Mermaid rendering error:', err);
                         if (svgContainerRef.current) {
                            svgContainerRef.current.innerHTML = `<p class="text-red-400 p-4">Error rendering mind map. The generated code might be invalid.</p>`;
                         }
                    })
                    .finally(() => {
                        setIsRendering(false);
                    });
            } catch (e) {
                console.error("Mermaid parsing failed:", e);
                if (svgContainerRef.current) {
                    svgContainerRef.current.innerHTML = `<p class="text-red-400 p-4">Could not parse the mind map data.</p>`;
                }
                setIsRendering(false);
            }
        } else if (!mermaidCode) {
            setIsRendering(false);
        }
    }, [mermaidCode, centerView, onSubtopicClick, onMainTopicClick, mainTopic]);
    
    // Zoom handler
    const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
        if (isRendering) return;
        e.preventDefault();

        const { deltaY } = e;
        const scaleAmount = -deltaY / 500;
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, view.scale + scaleAmount));

        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const worldX = (mouseX - view.x) / view.scale;
        const worldY = (mouseY - view.y) / view.scale;
        
        const newX = mouseX - worldX * newScale;
        const newY = mouseY - worldY * newScale;

        setView({ scale: newScale, x: newX, y: newY });
    };

    // Pan handlers
    const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
        if (isRendering || e.button !== 0) return; // Only left-click
        e.preventDefault();
        panStartRef.current = { x: e.clientX - view.x, y: e.clientY - view.y };
        setIsPanning(true);
    };

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!isPanning || isRendering) return;
        e.preventDefault();
        const newX = e.clientX - panStartRef.current.x;
        const newY = e.clientY - panStartRef.current.y;
        setView(prev => ({ ...prev, x: newX, y: newY }));
    };

    const handleMouseUpOrLeave = () => {
        setIsPanning(false);
    };

    // UI Control handlers
    const handleZoom = (direction: 'in' | 'out') => {
        const scaleAmount = direction === 'in' ? 0.2 : -0.2;
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, view.scale + scaleAmount));
        
        if (panWrapperRef.current) {
            const rect = panWrapperRef.current.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const worldX = (centerX - view.x) / view.scale;
            const worldY = (centerY - view.y) / view.scale;
            
            const newX = centerX - worldX * newScale;
            const newY = centerY - worldY * newScale;
            
            setView({ scale: newScale, x: newX, y: newY });
        } else {
             setView(prev => ({ ...prev, scale: newScale }));
        }
    };
    
    const handleExport = (format: 'svg' | 'png') => {
        const svgElement = svgContainerRef.current?.querySelector('svg');
        if (!svgElement) {
            console.error("Could not find SVG element to export.");
            return;
        }
    
        // Clone the SVG to avoid modifying the one on screen
        const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
        // Ensure the clone doesn't have the pan/zoom transform
        svgClone.style.transform = '';
    
        // Serialize the cloned SVG to a string
        const svgString = new XMLSerializer().serializeToString(svgClone);
    
        const download = (href: string, filename: string) => {
            const link = document.createElement('a');
            link.href = href;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        if (format === 'svg') {
            const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            download(url, 'mindmap.svg');
            URL.revokeObjectURL(url);
        } else if (format === 'png') {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.error("Could not get canvas context.");
                return;
            }
            const img = new Image();

            // Use a data URI to load the SVG into the image element. This is more reliable.
            // The unescape/encodeURIComponent is a trick to handle UTF-8 characters correctly with btoa.
            const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));

            img.onload = () => {
                // Use the SVG's own width and height attributes for sizing, with a fallback to viewBox
                const svgWidth = svgClone.width.baseVal.value || svgClone.viewBox.baseVal.width;
                const svgHeight = svgClone.height.baseVal.value || svgClone.viewBox.baseVal.height;
                
                if (!svgWidth || !svgHeight) {
                    console.error("Could not determine SVG dimensions for PNG export.");
                    return;
                }

                canvas.width = svgWidth;
                canvas.height = svgHeight;
                
                // Add a dark background to the canvas, as the SVG is transparent and has light text
                ctx.fillStyle = '#111827'; // bg-gray-900
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                ctx.drawImage(img, 0, 0, svgWidth, svgHeight);
                const pngUrl = canvas.toDataURL('image/png');
                download(pngUrl, 'mindmap.png');
            };
            
            img.onerror = (err) => {
                 console.error('Image loading for PNG export failed:', err);
                 console.error("Failed to convert SVG to PNG. The browser could not load the SVG data into an Image object.");
            }
            img.src = svgDataUrl;
        }
        
        setShowExportOptions(false);
    };


    return (
        <div className="w-full p-4 flex justify-center items-center min-h-[20rem] relative">
            <div 
                ref={panWrapperRef}
                className={`w-full h-full min-h-[20rem] rounded-lg overflow-hidden bg-black/10 ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
            >
                {isRendering && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-black/30 z-10">
                        <svg className="animate-spin h-8 w-8 text-purple-400 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Rendering visualization...</span>
                    </div>
                )}
                <div 
                  ref={svgContainerRef}
                  style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, transformOrigin: 'top left' }}
                  className={`transition-opacity duration-300 ${isRendering ? 'opacity-0' : 'opacity-100'}`}
                />
            </div>
             <div className="absolute bottom-6 right-6 bg-white/10 backdrop-blur-lg rounded-lg p-1.5 flex flex-col space-y-1 z-20 shadow-lg">
                <button onClick={() => handleZoom('in')} className="p-1.5 rounded-md hover:bg-white/20 transition-colors text-gray-200 hover:text-white" aria-label="Zoom in">
                    <Icon path="M12 4.5v15m7.5-7.5h-15" />
                </button>
                <button onClick={() => handleZoom('out')} className="p-1.5 rounded-md hover:bg-white/20 transition-colors text-gray-200 hover:text-white" aria-label="Zoom out">
                    <Icon path="M19.5 12h-15" />
                </button>
                 <div className="relative">
                    <button onClick={() => setShowExportOptions(prev => !prev)} className="p-1.5 rounded-md hover:bg-white/20 transition-colors text-gray-200 hover:text-white" aria-label="Export mind map">
                        <Icon path="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </button>
                    {showExportOptions && (
                        <div className="absolute bottom-full right-0 mb-2 w-36 bg-gray-800/80 backdrop-blur-md rounded-lg p-1.5 shadow-xl animate-fade-in-up transition-all duration-200">
                           <button onClick={() => handleExport('svg')} className="w-full text-left text-sm px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors text-gray-200 hover:text-white">
                                Save as SVG
                            </button>
                            <button onClick={() => handleExport('png')} className="w-full text-left text-sm px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors text-gray-200 hover:text-white">
                                Save as PNG
                            </button>
                        </div>
                    )}
                 </div>
                <button onClick={centerView} className="p-1.5 rounded-md hover:bg-white/20 transition-colors text-gray-200 hover:text-white" aria-label="Reset view">
                    <Icon path="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.667 0l3.182-3.182m0-11.667a8.25 8.25 0 00-11.667 0L2.985 7.985" />
                </button>
            </div>
        </div>
    );
};