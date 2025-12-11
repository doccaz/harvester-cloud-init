import React, { useState, useMemo } from 'react';
import { CloudInitConfig } from '../types';
import { parseAndValidateYaml } from '../utils/import';
import { FileUp, AlertCircle, CheckCircle, AlertTriangle, ArrowRight, Lightbulb } from 'lucide-react';
import CodeEditor from './CodeEditor';

interface ImporterProps {
  onImport: (configs: CloudInitConfig[]) => void;
}

const Importer: React.FC<ImporterProps> = ({ onImport }) => {
  const [yamlInput, setYamlInput] = useState('');
  const [validationResult, setValidationResult] = useState<any>(null);

  const handleValidate = () => {
    const result = parseAndValidateYaml(yamlInput);
    setValidationResult(result);
  };

  const handleImport = () => {
    if (validationResult && validationResult.isValid && validationResult.configs) {
      onImport(validationResult.configs);
    }
  };

  const getErrorHint = (error: string) => {
    if (error.includes('multiline key may not be an implicit key') || error.includes('can not read a block mapping entry')) {
      return {
          title: "Broken Multiline String Detected",
          message: "This usually happens when a line inside a block scalar ('|') is not indented correctly. YAML interprets the unindented line as a new key instead of text content."
      };
    }
    return null;
  };

  // Extract error line numbers from validation errors
  const errorLines = useMemo(() => {
    if (!validationResult || validationResult.isValid || !validationResult.errors) return [];
    
    const lines: Set<number> = new Set();
    validationResult.errors.forEach((err: string) => {
        // Regex patterns for various JS-YAML error formats
        // 1. "at line 50, column 1"
        // 2. "(50:1)"
        // 3. "line 50"
        const patterns = [
            /line (\d+)/i,
            /\((\d+):\d+\)/,
            /at line (\d+)/i
        ];

        patterns.forEach(pattern => {
            const match = err.match(pattern);
            if (match && match[1]) {
                const lineNum = parseInt(match[1], 10);
                if (!isNaN(lineNum)) {
                    lines.add(lineNum);
                }
            }
        });
    });
    return Array.from(lines);
  }, [validationResult]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Input Area */}
      <div className="flex flex-col h-[600px] lg:h-[80vh] bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-lg">
         {/* Using CodeEditor fills the container. min-h-0 is crucial for nested flex scrolling. */}
         <div className="flex-1 flex flex-col p-4 pb-0 min-h-0">
            <CodeEditor 
                label="YAML Configuration"
                value={yamlInput}
                onChange={(val) => {
                    setYamlInput(val);
                    setValidationResult(null);
                }}
                placeholder="Paste one or more YAML documents (separated by ---)..."
                className="flex-1 border-gray-700"
                errorLines={errorLines}
            />
         </div>
         
        <div className="p-4 bg-gray-900 flex-none z-10 border-t border-gray-800">
          <div className="flex justify-end gap-3">
             <button 
                onClick={() => setYamlInput('')}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
             >
                Clear
             </button>
             <button
                onClick={handleValidate}
                disabled={!yamlInput.trim()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-2 px-6 rounded transition-colors shadow-lg hover:shadow-emerald-900/20"
            >
                Validate Configuration
            </button>
          </div>
        </div>
      </div>

      {/* Results Area */}
      <div className="flex flex-col space-y-6">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 h-full overflow-y-auto">
          <h3 className="text-sm uppercase text-gray-500 font-bold mb-4">Validation Status</h3>
          
          {!validationResult && (
            <div className="text-center py-20 text-gray-600">
               <div className="bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileUp size={24} />
               </div>
               <p>Paste your YAML and click "Validate" to check for errors and preview the import.</p>
            </div>
          )}

          {validationResult && !validationResult.isValid && (
             <div className="space-y-4">
                 <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                    <div className="flex items-center text-red-400 font-bold mb-3 border-b border-red-500/20 pb-2">
                      <AlertCircle size={20} className="mr-2" />
                      Validation Failed
                    </div>
                    <ul className="list-none text-sm text-red-200 space-y-3">
                    {validationResult.errors.map((e: string, i: number) => {
                        const hint = getErrorHint(e);
                        return (
                          <li key={i} className="flex flex-col gap-2">
                              <span className="font-mono text-xs bg-red-950/50 p-2 rounded border border-red-900/50 break-all whitespace-pre-wrap">
                                {e}
                              </span>
                              {hint && (
                                  <div className="flex items-start bg-amber-500/10 border border-amber-500/20 rounded p-3 text-amber-200/90 text-xs">
                                      <Lightbulb size={16} className="text-amber-400 mr-2 flex-shrink-0 mt-0.5" />
                                      <div>
                                          <strong className="text-amber-400 block mb-1">{hint.title}</strong>
                                          {hint.message}
                                      </div>
                                  </div>
                              )}
                          </li>
                        );
                    })}
                    </ul>
                 </div>
             </div>
          )}

          {validationResult && validationResult.isValid && (
              <div className="space-y-4">
                  <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-4">
                    <div className="flex items-center text-emerald-400 font-bold mb-1">
                      <CheckCircle size={20} className="mr-2" />
                      Valid Configuration
                    </div>
                    <p className="text-xs text-emerald-200/70 ml-7">Structure matches Harvester/Elemental expectations.</p>
                  </div>

                  {validationResult.warnings.length > 0 && (
                     <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
                        <div className="flex items-center text-yellow-400 font-bold mb-2">
                          <AlertTriangle size={20} className="mr-2" />
                          Warnings
                        </div>
                        <ul className="list-disc list-inside text-sm text-yellow-200 space-y-1">
                          {validationResult.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
                        </ul>
                     </div>
                  )}

                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                     <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Import Preview</h4>
                     <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                         {validationResult.configs.map((cfg: any, idx: number) => (
                             <div key={idx} className="bg-gray-900 p-2 rounded flex justify-between items-center">
                                <div>
                                    <span className="block text-xs text-gray-200 font-bold">{cfg.name}</span>
                                    <span className="text-[10px] text-gray-500">{cfg.selectors.length} selectors</span>
                                </div>
                                <div className="text-emerald-400 font-mono text-xs font-bold">
                                    {cfg.actions.length} Actions
                                </div>
                             </div>
                         ))}
                     </div>
                  </div>

                  <button 
                    onClick={handleImport}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg flex items-center justify-center transition-all shadow-lg hover:shadow-emerald-900/20"
                  >
                    Load {validationResult.configs.length} Configs into Editor
                    <ArrowRight size={18} className="ml-2" />
                  </button>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Importer;