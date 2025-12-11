import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Maximize2, Minimize2, Copy, Check } from 'lucide-react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  minHeight?: string;
  className?: string;
  errorLines?: number[];
}

const CodeEditor: React.FC<CodeEditorProps> = ({ 
  value, 
  onChange, 
  placeholder, 
  label, 
  minHeight = "min-h-[80px]",
  className = "",
  errorLines = []
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Refs for scrolling synchronization
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // Calculate line numbers
  const lines = useMemo(() => {
    return value.split('\n').length;
  }, [value]);

  useEffect(() => {
    // Auto-focus when expanded
    if (isExpanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isExpanded]);

  // Sync scroll from textarea to gutter and highlight layer
  const handleScroll = () => {
    if (textareaRef.current) {
      const scrollTop = textareaRef.current.scrollTop;
      const scrollLeft = textareaRef.current.scrollLeft;
      
      if (gutterRef.current) {
        gutterRef.current.scrollTop = scrollTop;
      }
      if (highlightRef.current) {
        highlightRef.current.scrollTop = scrollTop;
        highlightRef.current.scrollLeft = scrollLeft;
      }
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderEditorControls = () => (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCopy}
        className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-700 transition-colors"
        title="Copy content"
      >
        {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
      </button>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-1.5 text-gray-400 hover:text-emerald-400 rounded hover:bg-gray-700 transition-colors flex items-center gap-1.5 text-xs font-medium"
        title={isExpanded ? "Exit Fullscreen" : "Edit in Fullscreen"}
      >
        {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        {isExpanded ? 'Minimize' : 'Expand'}
      </button>
    </div>
  );

  // Shared inner content for consistency
  // Use a render function instead of a Component to avoid focus loss on re-render
  const renderInnerEditor = (paddingClass: string) => (
    <div className="flex flex-1 relative min-h-0 bg-gray-950 group">
      {/* Gutter */}
      <div 
        ref={gutterRef}
        className={`flex-none w-12 text-right font-mono text-sm bg-gray-900 border-r border-gray-800 select-none overflow-hidden ${paddingClass}`}
        aria-hidden="true"
        style={{ paddingTop: '12px', lineHeight: '1.5rem' }} 
      >
        {Array.from({ length: lines }).map((_, i) => {
          const lineNum = i + 1;
          const isError = errorLines.includes(lineNum);
          return (
            <div 
                key={i} 
                style={{ height: '1.5rem' }}
                className={`px-2 transition-colors duration-200 ${isError ? 'text-red-500 font-bold bg-red-900/20' : 'text-gray-600'}`}
            >
                {lineNum}
            </div>
          );
        })}
        <div className="h-8"></div>
      </div>
      
      {/* Editor Area Wrapper */}
      <div className="flex-1 relative min-w-0">
          {/* Highlight Layer (Z-0) */}
          <div
            ref={highlightRef}
            className={`absolute inset-0 pointer-events-none font-mono text-sm overflow-hidden select-none z-0 ${paddingClass}`}
            style={{ paddingTop: '12px', lineHeight: '1.5rem' }}
            aria-hidden="true"
          >
            {Array.from({ length: lines }).map((_, i) => {
              const lineNum = i + 1;
              const isError = errorLines.includes(lineNum);
              return (
                <div 
                    key={i} 
                    style={{ height: '1.5rem' }}
                    className={`w-full transition-colors duration-200 ${isError ? 'bg-red-500/30 border-l-4 border-red-500' : ''}`}
                >
                    &#8203;
                </div>
              );
            })}
             <div className="h-8"></div>
          </div>

          {/* Textarea (Z-10) */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleScroll}
            placeholder={placeholder}
            spellCheck={false}
            className={`absolute inset-0 w-full h-full font-mono text-sm text-gray-300 focus:outline-none resize-none whitespace-pre z-10 ${paddingClass}`}
            style={{ paddingTop: '12px', lineHeight: '1.5rem', backgroundColor: 'transparent' }} 
          />
      </div>
    </div>
  );

  // Expanded Modal View
  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col animate-in fade-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800">
          <h3 className="text-lg font-bold text-gray-200 flex items-center">
            {label || 'Editor'}
          </h3>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">Press ESC to close</span>
            {renderEditorControls()}
          </div>
        </div>
        <div className="flex-1 p-6 overflow-hidden flex flex-col">
           <div className="flex-1 flex flex-col border border-gray-800 rounded-lg overflow-hidden bg-gray-950 shadow-2xl">
             {renderInnerEditor("pl-4 pr-4")}
           </div>
        </div>
      </div>
    );
  }

  // Inline View
  return (
    <div className={`flex flex-col bg-gray-900 border border-gray-700 rounded overflow-hidden transition-colors focus-within:border-emerald-500/50 ${className}`}>
      {label && (
        <div className="flex justify-between items-center px-3 py-2 bg-gray-800/50 border-b border-gray-700/50">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</span>
          {renderEditorControls()}
        </div>
      )}
      <div className={`relative flex-1 flex flex-col min-h-0 ${minHeight} group`}>
        {!label && (
           <div className="absolute top-2 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
              {renderEditorControls()}
           </div>
        )}
        {renderInnerEditor("pl-3 pr-3 pb-3")}
      </div>
    </div>
  );
};

export default CodeEditor;