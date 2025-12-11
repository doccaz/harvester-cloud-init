import React, { useState, useMemo } from 'react';
import { AppState, ActionType, Phase, CloudAction, NodeSelector, CloudInitConfig } from './types';
import ActionForm from './components/ActionForm';
import ActionItem from './components/ActionItem';
import Summary from './components/Summary';
import Importer from './components/Importer';
import HowTo from './components/HowTo';
import About from './components/About';
import { generateYaml } from './utils/yaml';
import { 
  FileText, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Code, 
  Layers, 
  Box, 
  Menu,
  FileCode,
  Server,
  FileUp,
  Plus,
  BookOpen,
  Github,
  Download,
  Sparkles,
  Edit3,
  HelpCircle,
  Info
} from 'lucide-react';

enum Tab {
  EDITOR = 'editor',
  IMPORT = 'import',
  PREVIEW = 'preview',
  SUMMARY = 'summary',
  HOWTO = 'howto',
  ABOUT = 'about'
}

const HarvesterLogo = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-0">
    <path d="M16 2L2 9L16 16L30 9L16 2Z" fill="#30BA78"/>
    <path d="M2 23L16 30L30 23V9L16 16L2 9V23Z" fill="#248F5B"/>
    <path d="M16 16L30 9V23L16 30V16Z" fill="#1A6D46"/>
    <path d="M16 16L2 9V23L16 30V16Z" fill="#30BA78" fillOpacity="0.8"/>
  </svg>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.EDITOR);
  
  // Lifted state for AI Summary to persist across tab switches
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  
  // Initial State with one default config
  const initialConfigId = Math.random().toString(36).substr(2, 9);
  const [state, setState] = useState<AppState>({
    configs: [
        {
            id: initialConfigId,
            name: 'custom-node-config',
            selectors: [],
            actions: []
        }
    ],
    activeConfigId: initialConfigId
  });

  // Helper to get active config
  const activeConfig = state.configs.find(c => c.id === state.activeConfigId) || state.configs[0];

  // --- Config Management ---
  const addConfig = () => {
      const newId = Math.random().toString(36).substr(2, 9);
      setState(prev => ({
          ...prev,
          configs: [...prev.configs, {
              id: newId,
              name: `new-config-${prev.configs.length + 1}`,
              selectors: [],
              actions: []
          }],
          activeConfigId: newId
      }));
  };

  const deleteConfig = (id: string) => {
      if (state.configs.length <= 1) return; // Prevent deleting last config
      const newConfigs = state.configs.filter(c => c.id !== id);
      setState(prev => ({
          ...prev,
          configs: newConfigs,
          activeConfigId: id === prev.activeConfigId ? newConfigs[0].id : prev.activeConfigId
      }));
  };

  const updateActiveConfig = (updates: Partial<CloudInitConfig>) => {
      setState(prev => ({
          ...prev,
          configs: prev.configs.map(c => c.id === prev.activeConfigId ? { ...c, ...updates } : c)
      }));
  };

  // --- Action Management ---
  const addAction = (action: CloudAction) => {
      updateActiveConfig({ actions: [...activeConfig.actions, action] });
  };

  const updateAction = (id: string, updatedAction: CloudAction) => {
      updateActiveConfig({
          actions: activeConfig.actions.map(a => a.id === id ? updatedAction : a)
      });
  };

  const removeAction = (id: string) => {
      updateActiveConfig({ actions: activeConfig.actions.filter(a => a.id !== id) });
  };

  const moveAction = (index: number, direction: 'up' | 'down') => {
    const newActions = [...activeConfig.actions];
    if (direction === 'up' && index > 0) {
      [newActions[index], newActions[index - 1]] = [newActions[index - 1], newActions[index]];
    } else if (direction === 'down' && index < newActions.length - 1) {
      [newActions[index], newActions[index + 1]] = [newActions[index + 1], newActions[index]];
    }
    updateActiveConfig({ actions: newActions });
  };

  // --- Selector Management ---
  const addSelector = () => {
    const newSelector: NodeSelector = {
      id: Math.random().toString(36).substr(2, 9),
      key: 'kubernetes.io/hostname',
      operator: '==',
      value: ''
    };
    updateActiveConfig({ selectors: [...activeConfig.selectors, newSelector] });
  };

  const updateSelector = (id: string, field: keyof NodeSelector, value: string) => {
    updateActiveConfig({
        selectors: activeConfig.selectors.map(s => s.id === id ? { ...s, [field]: value } : s)
    });
  };

  const removeSelector = (id: string) => {
    updateActiveConfig({ selectors: activeConfig.selectors.filter(s => s.id !== id) });
  };

  // --- Import ---
  const handleImport = (importedConfigs: CloudInitConfig[]) => {
    if (importedConfigs.length === 0) return;
    setState({
        configs: importedConfigs,
        activeConfigId: importedConfigs[0].id
    });
    setActiveTab(Tab.EDITOR);
  };

  const downloadYaml = () => {
    const blob = new Blob([generatedYaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'harvester-cloud-config.yaml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generatedYaml = useMemo(() => generateYaml(state.configs), [state.configs]);

  return (
    <div className="flex flex-col h-screen bg-[#0C322C] text-gray-100 font-sans">
      
      {/* Header */}
      <header className="flex items-center px-6 py-4 bg-[#092621] border-b border-[#1A453C] shadow-md z-10">
        <div className="p-1 mr-4">
          <HarvesterLogo />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">SUSE Harvester CloudInit Architect</h1>
          <p className="text-xs text-[#30BA78] font-medium tracking-wide">Visual Configuration Editor</p>
        </div>
        <div className="ml-auto flex bg-[#0C322C] rounded-lg p-1 border border-[#1A453C] mr-8">
          <button 
            onClick={() => setActiveTab(Tab.EDITOR)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center ${activeTab === Tab.EDITOR ? 'bg-[#30BA78] text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <Edit3 size={14} className="mr-2" />
            Editor
          </button>
          <button 
            onClick={() => setActiveTab(Tab.IMPORT)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center ${activeTab === Tab.IMPORT ? 'bg-[#30BA78] text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <FileUp size={14} className="mr-2" />
            Import
          </button>
          <button 
            onClick={() => setActiveTab(Tab.PREVIEW)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center ${activeTab === Tab.PREVIEW ? 'bg-[#30BA78] text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <Code size={14} className="mr-2" />
            YAML Preview
          </button>
           <button 
            onClick={() => setActiveTab(Tab.SUMMARY)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center ${activeTab === Tab.SUMMARY ? 'bg-[#30BA78] text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
          >
             <Sparkles size={14} className="mr-2" />
            AI Summary
          </button>
          <button 
            onClick={() => setActiveTab(Tab.HOWTO)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center ${activeTab === Tab.HOWTO ? 'bg-[#30BA78] text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <HelpCircle size={14} className="mr-2" />
            How To Use
          </button>
          <button 
            onClick={() => setActiveTab(Tab.ABOUT)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center ${activeTab === Tab.ABOUT ? 'bg-[#30BA78] text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <Info size={14} className="mr-2" />
            About
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative bg-[#0C322C]">
        <div className="absolute inset-0 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6 pb-20">
            
            {activeTab === Tab.EDITOR && (
              <>
              {/* Config Manager Bar */}
              <div className="flex items-center gap-4 mb-6 bg-[#092621] p-3 rounded-xl border border-[#1A453C]">
                  <div className="text-sm font-bold text-gray-400 uppercase tracking-wider px-2">Configuration:</div>
                  <div className="flex-1 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                      {state.configs.map(cfg => (
                          <button
                            key={cfg.id}
                            onClick={() => setState(p => ({ ...p, activeConfigId: cfg.id }))}
                            className={`flex items-center px-3 py-1.5 rounded text-sm whitespace-nowrap border transition-all ${
                                cfg.id === state.activeConfigId 
                                ? 'bg-[#30BA78] text-white border-[#30BA78] shadow' 
                                : 'bg-[#0C322C] text-gray-400 border-[#1A453C] hover:border-[#30BA78]/50'
                            }`}
                          >
                             {cfg.name || 'Unnamed'}
                          </button>
                      ))}
                      <button 
                        onClick={addConfig}
                        className="px-3 py-1.5 rounded text-sm bg-[#0C322C] text-emerald-400 border border-emerald-900/50 hover:bg-emerald-900/20 transition-all flex items-center"
                        title="Add New Configuration"
                      >
                         <Plus size={14} />
                      </button>
                  </div>
                  {state.configs.length > 1 && (
                      <button 
                        onClick={() => deleteConfig(activeConfig.id)}
                        className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete Current Configuration"
                      >
                          <Trash2 size={18} />
                      </button>
                  )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column: Input Forms */}
                <div className="space-y-6">
                  {/* Config Metadata */}
                  <div className="bg-[#092621] border border-[#1A453C] rounded-xl p-5">
                    <h3 className="text-sm uppercase text-gray-500 font-bold mb-4 flex items-center">
                      <FileCode size={16} className="mr-2" />
                      Configuration Info
                    </h3>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Config Name</label>
                      <input 
                        type="text" 
                        value={activeConfig.name} 
                        onChange={(e) => updateActiveConfig({ name: e.target.value })}
                        className="w-full bg-[#0C322C] border border-[#1A453C] rounded px-3 py-2 text-sm text-gray-200 focus:border-[#30BA78] focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Node Selectors */}
                  <div className="bg-[#092621] border border-[#1A453C] rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm uppercase text-gray-500 font-bold flex items-center">
                        <Server size={16} className="mr-2" />
                        Target Nodes
                      </h3>
                      <button onClick={addSelector} className="text-[#30BA78] text-xs hover:text-emerald-300 transition-colors">+ Add Selector</button>
                    </div>
                    
                    {activeConfig.selectors.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">No node selectors. Applies to all matched by other rules.</p>
                    ) : (
                      <div className="space-y-2">
                        {activeConfig.selectors.map(sel => (
                          <div key={sel.id} className="flex items-center gap-2 bg-[#0C322C] p-2 rounded border border-[#1A453C]">
                             <input 
                                className="w-1/3 bg-transparent text-xs text-gray-300 focus:outline-none border-b border-transparent focus:border-[#30BA78]"
                                value={sel.key}
                                onChange={(e) => updateSelector(sel.id, 'key', e.target.value)}
                                placeholder="Key"
                             />
                             <select
                                className="bg-[#092621] text-xs text-gray-400 rounded focus:outline-none"
                                value={sel.operator}
                                onChange={(e) => updateSelector(sel.id, 'operator', e.target.value as any)}
                             >
                               <option value="==">==</option>
                               <option value="!=">!=</option>
                               <option value="Exists">Exists</option>
                             </select>
                             <input 
                                className="w-1/3 bg-transparent text-xs text-gray-300 focus:outline-none border-b border-transparent focus:border-[#30BA78]"
                                value={sel.value}
                                onChange={(e) => updateSelector(sel.id, 'value', e.target.value)}
                                placeholder="Value"
                             />
                             <button onClick={() => removeSelector(sel.id)} className="text-red-400 hover:text-red-300">
                               <Trash2 size={14} />
                             </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add Action Form */}
                  <div className="bg-[#092621] border border-[#1A453C] rounded-xl p-5">
                    <h3 className="text-sm uppercase text-gray-500 font-bold mb-4 flex items-center">
                      <Box size={16} className="mr-2" />
                      New Action
                    </h3>
                    <ActionForm onAdd={addAction} />
                  </div>
                </div>

                {/* Right Column: Action List */}
                <div className="lg:col-span-2 space-y-4">
                   <h3 className="text-sm uppercase text-gray-500 font-bold mb-2 flex items-center">
                      <Menu size={16} className="mr-2" />
                      Configured Actions ({activeConfig.actions.length})
                    </h3>
                  
                  {activeConfig.actions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-[#1A453C] rounded-xl bg-[#092621]/50">
                       <Layers className="text-gray-700 mb-4" size={48} />
                       <p className="text-gray-500">No actions configured yet.</p>
                       <p className="text-gray-600 text-sm">Add an action from the sidebar to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeConfig.actions.map((action, idx) => (
                        <ActionItem 
                          key={action.id}
                          action={action}
                          index={idx}
                          total={activeConfig.actions.length}
                          onMove={moveAction}
                          onRemove={removeAction}
                          onUpdate={updateAction}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              </>
            )}

            {activeTab === Tab.PREVIEW && (
               <div className="h-full">
                 <div className="bg-[#092621] rounded-lg border border-[#1A453C] p-4 shadow-inner overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
                    <div className="flex justify-between items-center mb-4 border-b border-[#1A453C] pb-2">
                        <span className="text-sm font-mono text-gray-500">full-config.yaml</span>
                        <div className="flex gap-2">
                            <button 
                               onClick={downloadYaml}
                               className="text-xs flex items-center bg-[#0C322C] border border-[#1A453C] hover:bg-[#1A453C] px-3 py-1 rounded text-gray-300 transition-colors"
                            >
                               <Download size={12} className="mr-1.5" />
                               Download YAML
                            </button>
                            <button 
                               onClick={() => navigator.clipboard.writeText(generatedYaml)}
                               className="text-xs bg-[#0C322C] border border-[#1A453C] hover:bg-[#1A453C] px-3 py-1 rounded text-gray-300 transition-colors"
                            >
                               Copy to Clipboard
                            </button>
                        </div>
                    </div>
                    <pre className="flex-1 overflow-auto font-mono text-sm text-gray-300 leading-relaxed selection:bg-emerald-900">
                      {generatedYaml}
                    </pre>
                 </div>
               </div>
            )}

            {activeTab === Tab.HOWTO && (
              <HowTo />
            )}

            {activeTab === Tab.ABOUT && (
              <About />
            )}

            {activeTab === Tab.SUMMARY && (
              <div className="max-w-4xl mx-auto">
                <Summary 
                    yaml={generatedYaml} 
                    currentSummary={aiSummary}
                    onSummaryUpdate={setAiSummary}
                />
              </div>
            )}

            {activeTab === Tab.IMPORT && (
               <div className="h-full">
                  <Importer onImport={handleImport} />
               </div>
            )}
            
          </div>
        </div>
      </main>

      {/* Version Footer */}
      <div className="fixed bottom-3 left-6 text-[10px] text-gray-600 font-mono z-50">
        v1.0.1
      </div>

      {/* Diagonal GitHub Ribbon (Bottom Right) */}
      <div className="fixed bottom-0 right-0 z-50 w-32 h-32 overflow-hidden pointer-events-none">
        <a 
           href="https://github.com/doccaz/harvester-cloud-init" 
           target="_blank" 
           rel="noopener noreferrer"
           className="absolute block w-[200px] py-1.5 bottom-[25px] -right-[60px] transform -rotate-45 bg-gray-800 text-white text-[10px] font-bold text-center border-y border-gray-600 shadow-lg hover:bg-[#30BA78] hover:text-white transition-colors uppercase tracking-wider pointer-events-auto"
        >
           Fork on GitHub
        </a>
      </div>

    </div>
  );
};

export default App;