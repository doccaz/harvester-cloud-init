import React, { useState } from 'react';
import { ActionType, CloudAction, WriteFileAction, RunCmdAction, PackageAction, UserAction, ServiceAction, Phase } from '../types';
import { ArrowUp, ArrowDown, Trash2, ChevronDown, ChevronRight, FileText, Terminal, Package, User, Settings, Shield, Key, Edit2, Check, X, Save } from 'lucide-react';
import CodeEditor from './CodeEditor';

interface ActionItemProps {
  action: CloudAction;
  index: number;
  total: number;
  onMove: (index: number, dir: 'up' | 'down') => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updatedAction: CloudAction) => void;
}

const ActionItem: React.FC<ActionItemProps> = ({ action, index, total, onMove, onRemove, onUpdate }) => {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedAction, setEditedAction] = useState<CloudAction>(action);

  const startEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditedAction({ ...action }); // Clone
    setIsEditing(true);
    setExpanded(true);
  };

  const saveEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate(action.id, editedAction);
    setIsEditing(false);
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
    setEditedAction(action);
  };

  const handleTypeChange = (newType: ActionType) => {
    const base = { id: editedAction.id, phase: editedAction.phase, type: newType };
    let newAction: CloudAction;

    switch (newType) {
        case ActionType.WRITE_FILE:
            newAction = { ...base, path: '/tmp/file.txt', content: '', permissions: '0644', owner: 'root', encoding: 'text' } as WriteFileAction;
            break;
        case ActionType.RUN_CMD:
            newAction = { ...base, command: 'echo "hello"' } as RunCmdAction;
            break;
        case ActionType.PACKAGE:
            newAction = { ...base, packageName: '' } as PackageAction;
            break;
        case ActionType.USER:
            newAction = { ...base, username: 'user', groups: 'docker', sshKey: '' } as UserAction;
            break;
        case ActionType.SERVICE:
            newAction = { ...base, serviceName: 'service', state: 'start' } as ServiceAction;
            break;
        default:
            newAction = { ...base } as any;
    }
    setEditedAction(newAction);
  };

  const updateField = (field: string, value: any) => {
      setEditedAction(prev => ({ ...prev, [field]: value }));
  };

  const getPhaseColor = (phase: Phase) => {
    switch(phase) {
      case Phase.GLOBAL: return 'bg-blue-900/30 text-blue-300 border-blue-800';
      case Phase.BOOT: return 'bg-emerald-900/30 text-emerald-300 border-emerald-800';
      case Phase.PRE_INSTALL: return 'bg-orange-900/30 text-orange-300 border-orange-800';
      case Phase.POST_INSTALL: return 'bg-purple-900/30 text-purple-300 border-purple-800';
      case Phase.NETWORK: return 'bg-cyan-900/30 text-cyan-300 border-cyan-800';
      default: return 'bg-gray-800 text-gray-300';
    }
  };

  const getIcon = () => {
    switch(action.type) {
        case ActionType.RUN_CMD: return <Terminal size={16} className="text-emerald-400" />;
        case ActionType.WRITE_FILE: return <FileText size={16} className="text-blue-400" />;
        case ActionType.PACKAGE: return <Package size={16} className="text-yellow-400" />;
        case ActionType.USER: return <User size={16} className="text-pink-400" />;
        case ActionType.SERVICE: return <Settings size={16} className="text-purple-400" />;
        default: return <Settings size={16} />;
    }
  };

  const renderSummary = () => {
    switch(action.type) {
        case ActionType.RUN_CMD:
            return <span className="text-gray-300 truncate">$ {(action as RunCmdAction).command}</span>;
        case ActionType.WRITE_FILE:
            return <span className="text-gray-300 truncate">File: {(action as WriteFileAction).path}</span>;
        case ActionType.PACKAGE:
            return <span className="text-gray-300 truncate">Install: {(action as PackageAction).packageName}</span>;
        case ActionType.USER:
            return <span className="text-gray-300 truncate">User: {(action as UserAction).username}</span>;
        case ActionType.SERVICE:
            const sa = action as ServiceAction;
            return <span className="text-gray-300 truncate">Service: {sa.serviceName} <span className="opacity-50">({sa.state})</span></span>;
    }
  };

  const renderDetails = () => {
      switch(action.type) {
          case ActionType.RUN_CMD:
              return (
                  <div className="space-y-1">
                      <div className="text-xs text-gray-500 uppercase font-bold">Command</div>
                      <div className="bg-gray-950 p-2 rounded border border-gray-800 break-all text-emerald-400 whitespace-pre-wrap">
                          {(action as RunCmdAction).command}
                      </div>
                  </div>
              );
          case ActionType.WRITE_FILE:
              const wfa = action as WriteFileAction;
              return (
                  <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <div className="text-xs text-gray-500 uppercase font-bold mb-1">Path</div>
                              <div className="text-gray-300 bg-gray-950 px-2 py-1 rounded border border-gray-800">{wfa.path}</div>
                          </div>
                          <div>
                              <div className="text-xs text-gray-500 uppercase font-bold mb-1">Permissions</div>
                              <div className="text-gray-300 bg-gray-950 px-2 py-1 rounded border border-gray-800 flex items-center">
                                  <Shield size={12} className="mr-1 text-gray-500" />
                                  {wfa.permissions} ({wfa.owner})
                              </div>
                          </div>
                      </div>
                      <div>
                          <div className="text-xs text-gray-500 uppercase font-bold mb-1">Content</div>
                          <pre className="bg-gray-950 p-2 rounded border border-gray-800 text-gray-300 whitespace-pre-wrap text-xs max-h-40 overflow-auto">
                              {wfa.content}
                          </pre>
                      </div>
                  </div>
              );
           case ActionType.PACKAGE:
              return (
                  <div>
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">Package Name</div>
                      <div className="text-gray-300 bg-gray-950 px-2 py-1 rounded border border-gray-800">
                          {(action as PackageAction).packageName}
                      </div>
                  </div>
              );
           case ActionType.SERVICE:
              const sa = action as ServiceAction;
              return (
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <div className="text-xs text-gray-500 uppercase font-bold mb-1">Service</div>
                          <div className="text-gray-300 bg-gray-950 px-2 py-1 rounded border border-gray-800">{sa.serviceName}</div>
                      </div>
                      <div>
                          <div className="text-xs text-gray-500 uppercase font-bold mb-1">Action</div>
                          <div className="text-gray-300 bg-gray-950 px-2 py-1 rounded border border-gray-800 uppercase text-xs font-bold tracking-wider">
                              {sa.state}
                          </div>
                      </div>
                  </div>
              );
           case ActionType.USER:
              const ua = action as UserAction;
              return (
                  <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <div className="text-xs text-gray-500 uppercase font-bold mb-1">Username</div>
                              <div className="text-gray-300 bg-gray-950 px-2 py-1 rounded border border-gray-800">{ua.username}</div>
                          </div>
                          <div>
                              <div className="text-xs text-gray-500 uppercase font-bold mb-1">Groups</div>
                              <div className="text-gray-300 bg-gray-950 px-2 py-1 rounded border border-gray-800">{ua.groups}</div>
                          </div>
                      </div>
                      {ua.sshKey && (
                          <div>
                              <div className="text-xs text-gray-500 uppercase font-bold mb-1">SSH Key</div>
                              <div className="bg-gray-950 p-2 rounded border border-gray-800 text-gray-300 text-xs break-all flex">
                                  <Key size={14} className="mr-2 flex-shrink-0 text-gray-500 mt-0.5" />
                                  {ua.sshKey}
                              </div>
                          </div>
                      )}
                  </div>
              );
      }
  };

  const renderEditForm = () => {
    return (
      <div className="space-y-4 pt-2">
         {/* Common Header: Phase and Type */}
         <div className="grid grid-cols-2 gap-4 pb-2 border-b border-gray-700">
            <div>
               <label className="block text-xs uppercase text-gray-400 font-bold mb-1">Phase</label>
               <select 
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-emerald-500"
                  value={editedAction.phase}
                  onChange={(e) => updateField('phase', e.target.value)}
               >
                  {Object.values(Phase).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
               </select>
            </div>
            <div>
               <label className="block text-xs uppercase text-gray-400 font-bold mb-1">Type</label>
               <select 
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-emerald-500"
                  value={editedAction.type}
                  onChange={(e) => handleTypeChange(e.target.value as ActionType)}
               >
                  <option value={ActionType.RUN_CMD}>Run Command</option>
                  <option value={ActionType.WRITE_FILE}>Write File</option>
                  <option value={ActionType.SERVICE}>System Service</option>
                  <option value={ActionType.PACKAGE}>Install Package</option>
                  <option value={ActionType.USER}>Create User</option>
               </select>
            </div>
         </div>

         {/* Type Specific Fields */}
         <div className="space-y-3">
             {editedAction.type === ActionType.RUN_CMD && (
                 <div>
                    <label className="block text-xs text-gray-400 mb-1">Command</label>
                    <CodeEditor 
                       value={(editedAction as RunCmdAction).command}
                       onChange={(val) => updateField('command', val)}
                       minHeight="min-h-[80px]"
                    />
                 </div>
             )}

             {editedAction.type === ActionType.WRITE_FILE && (
                 <>
                    <div>
                       <label className="block text-xs text-gray-400 mb-1">Path</label>
                       <input 
                          className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 font-mono focus:border-emerald-500 focus:outline-none"
                          value={(editedAction as WriteFileAction).path}
                          onChange={(e) => updateField('path', e.target.value)}
                       />
                    </div>
                    <div className="flex gap-2">
                       <div className="flex-1">
                          <label className="block text-xs text-gray-400 mb-1">Permissions</label>
                          <input 
                             className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 font-mono focus:border-emerald-500 focus:outline-none"
                             value={(editedAction as WriteFileAction).permissions}
                             onChange={(e) => updateField('permissions', e.target.value)}
                          />
                       </div>
                       <div className="flex-1">
                          <label className="block text-xs text-gray-400 mb-1">Owner</label>
                          <input 
                             className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 font-mono focus:border-emerald-500 focus:outline-none"
                             value={(editedAction as WriteFileAction).owner}
                             onChange={(e) => updateField('owner', e.target.value)}
                          />
                       </div>
                    </div>
                    <div>
                       <label className="block text-xs text-gray-400 mb-1">Content</label>
                       <CodeEditor 
                          value={(editedAction as WriteFileAction).content}
                          onChange={(val) => updateField('content', val)}
                          minHeight="min-h-[120px]"
                       />
                    </div>
                 </>
             )}

             {editedAction.type === ActionType.PACKAGE && (
                 <div>
                    <label className="block text-xs text-gray-400 mb-1">Package Name</label>
                    <input 
                       className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 font-mono focus:border-emerald-500 focus:outline-none"
                       value={(editedAction as PackageAction).packageName}
                       onChange={(e) => updateField('packageName', e.target.value)}
                    />
                 </div>
             )}

             {editedAction.type === ActionType.SERVICE && (
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs text-gray-400 mb-1">Service Name</label>
                       <input 
                          className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 font-mono focus:border-emerald-500 focus:outline-none"
                          value={(editedAction as ServiceAction).serviceName}
                          onChange={(e) => updateField('serviceName', e.target.value)}
                       />
                    </div>
                    <div>
                       <label className="block text-xs text-gray-400 mb-1">State</label>
                       <select 
                          className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 focus:outline-none"
                          value={(editedAction as ServiceAction).state}
                          onChange={(e) => updateField('state', e.target.value)}
                       >
                          <option value="start">Start</option>
                          <option value="restart">Restart</option>
                          <option value="stop">Stop</option>
                          <option value="enable">Enable</option>
                          <option value="disable">Disable</option>
                       </select>
                    </div>
                 </div>
             )}

             {editedAction.type === ActionType.USER && (
                 <>
                    <div>
                       <label className="block text-xs text-gray-400 mb-1">Username</label>
                       <input 
                          className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 font-mono focus:border-emerald-500 focus:outline-none"
                          value={(editedAction as UserAction).username}
                          onChange={(e) => updateField('username', e.target.value)}
                       />
                    </div>
                    <div>
                       <label className="block text-xs text-gray-400 mb-1">Groups</label>
                       <input 
                          className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 font-mono focus:border-emerald-500 focus:outline-none"
                          value={(editedAction as UserAction).groups}
                          onChange={(e) => updateField('groups', e.target.value)}
                       />
                    </div>
                    <div>
                       <label className="block text-xs text-gray-400 mb-1">SSH Key</label>
                       <input 
                          className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 font-mono focus:border-emerald-500 focus:outline-none"
                          value={(editedAction as UserAction).sshKey}
                          onChange={(e) => updateField('sshKey', e.target.value)}
                       />
                    </div>
                 </>
             )}
         </div>
         
         <div className="flex justify-end gap-2 pt-2 border-t border-gray-700 mt-2">
            <button 
               onClick={cancelEditing}
               className="px-3 py-1.5 rounded text-xs font-medium text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors flex items-center"
            >
               <X size={14} className="mr-1" /> Cancel
            </button>
            <button 
               onClick={saveEditing}
               className="px-3 py-1.5 rounded text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center shadow-sm"
            >
               <Save size={14} className="mr-1" /> Save Changes
            </button>
         </div>
      </div>
    );
  };

  return (
    <div className={`bg-gray-800 rounded-lg border transition-all overflow-hidden ${expanded ? 'border-gray-600 shadow-lg' : 'border-gray-700 shadow-sm'}`}>
      <div className="flex items-center gap-2 p-3">
        {/* Reorder Controls */}
        <div className="flex flex-col space-y-0.5 text-gray-500">
            <button 
                onClick={(e) => { e.stopPropagation(); onMove(index, 'up'); }}
                disabled={index === 0}
                className="hover:text-emerald-400 disabled:opacity-20 transition-colors"
            >
                <ArrowUp size={14} />
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); onMove(index, 'down'); }}
                disabled={index === total - 1}
                className="hover:text-emerald-400 disabled:opacity-20 transition-colors"
            >
                <ArrowDown size={14} />
            </button>
        </div>

        {/* Main Click Area */}
        <div 
            className="flex-1 flex items-center gap-3 cursor-pointer select-none"
            onClick={() => !isEditing && setExpanded(!expanded)}
        >
            <div className="p-2 rounded bg-gray-900 border border-gray-700">
                {getIcon()}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${getPhaseColor(action.phase)}`}>
                        {action.phase}
                    </span>
                    <span className="text-[10px] font-mono text-gray-500 uppercase bg-gray-900 border border-gray-700 px-1 rounded">
                        {action.type.replace('_', ' ')}
                    </span>
                    {isEditing && (
                       <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border border-yellow-800 bg-yellow-900/30 text-yellow-500 ml-auto">
                          Editing
                       </span>
                    )}
                </div>
                <div className="text-sm font-mono flex items-center">
                    {renderSummary()}
                </div>
            </div>

            {!isEditing && (
               <div className="flex items-center gap-2">
                 <button 
                    onClick={startEditing}
                    className="p-1.5 text-gray-500 hover:text-emerald-400 hover:bg-gray-900 rounded transition-colors"
                    title="Edit Action"
                 >
                    <Edit2 size={16} />
                 </button>
                 <div className="text-gray-500 hover:text-gray-300 transition-colors">
                    {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                 </div>
               </div>
            )}
        </div>

        {/* Delete Action */}
        {!isEditing && (
            <button 
                onClick={(e) => { e.stopPropagation(); onRemove(action.id); }}
                className="p-2 text-gray-600 hover:text-red-400 hover:bg-gray-900 rounded transition-colors"
                title="Remove Action"
            >
                <Trash2 size={16} />
            </button>
        )}
      </div>

      {/* Expanded Details Panel */}
      {expanded && (
          <div className="border-t border-gray-700 bg-gray-900/30 p-4 animate-in slide-in-from-top-2 duration-200">
              {isEditing ? renderEditForm() : renderDetails()}
          </div>
      )}
    </div>
  );
};

export default ActionItem;