import React, { useState } from 'react';
import { ActionType, Phase, CloudAction, WriteFileAction, RunCmdAction, PackageAction, UserAction, ServiceAction } from '../types';
import { Plus, Package, User, Info } from 'lucide-react';
import CodeEditor from './CodeEditor';

interface ActionFormProps {
  onAdd: (action: CloudAction) => void;
}

const ActionForm: React.FC<ActionFormProps> = ({ onAdd }) => {
  const [type, setType] = useState<ActionType>(ActionType.RUN_CMD);
  const [phase, setPhase] = useState<Phase>(Phase.POST_INSTALL);
  
  // Form State
  const [commonState, setCommonState] = useState<any>({});

  const handleAdd = () => {
    const base = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      phase,
    };

    let newAction: CloudAction;

    switch (type) {
      case ActionType.WRITE_FILE:
        newAction = { 
          ...base, 
          path: commonState.path || '/tmp/file.txt', 
          content: commonState.content || '', 
          permissions: commonState.permissions || '0644',
          owner: commonState.owner || 'root',
          encoding: 'text',
        } as WriteFileAction;
        break;
      case ActionType.RUN_CMD:
        newAction = { ...base, command: commonState.command || 'echo "hello"' } as RunCmdAction;
        break;
      case ActionType.PACKAGE:
        newAction = { ...base, packageName: commonState.packageName || '' } as PackageAction;
        break;
      case ActionType.USER:
        newAction = { 
            ...base, 
            username: commonState.username || 'user',
            groups: commonState.groups || 'docker,sudo',
            sshKey: commonState.sshKey || ''
        } as UserAction;
        break;
       case ActionType.SERVICE:
        newAction = {
            ...base,
            serviceName: commonState.serviceName || 'multipathd',
            state: commonState.state || 'start'
        } as ServiceAction;
        break;
      default:
        return;
    }
    
    onAdd(newAction);
    setCommonState({}); // Reset form
  };

  const updateField = (key: string, value: string) => {
    setCommonState((prev: any) => ({ ...prev, [key]: value }));
  };

  const getPhaseInfo = (p: Phase) => {
    switch (p) {
      case Phase.GLOBAL:
        return {
          desc: "Executes very early (initramfs).",
          limit: "Root FS is ephemeral or read-only. Networking usually unavailable. Use for kernel modules."
        };
      case Phase.PRE_INSTALL:
        return {
          desc: "Runs in the installer environment BEFORE OS image is written.",
          limit: "Target disk is empty/unmounted. Use for installer hooks or hardware validation."
        };
      case Phase.POST_INSTALL:
        return {
          desc: "Runs after OS image is written, inside the target chroot.",
          limit: "Best for users/configs. Services can be enabled but NOT started (systemd is inactive)."
        };
      case Phase.BOOT:
        return {
          desc: "Runs on every system boot sequence.",
          limit: "Root FS is Immutable. Only /etc, /var, /home, /opt are writable. Changes to /usr lost on reboot."
        };
      case Phase.NETWORK:
        return {
          desc: "Runs after network interfaces are active.",
          limit: "Same immutable limits as Boot phase. Use for downloading assets/scripts."
        };
      default:
        return { desc: "", limit: "" };
    }
  };

  const phaseInfo = getPhaseInfo(phase);

  return (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-xl space-y-4">
      <div className="border-b border-gray-700 pb-4 mb-4">
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-xs uppercase text-gray-400 font-bold mb-1">Execution Phase</label>
            <select 
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
              value={phase}
              onChange={(e) => setPhase(e.target.value as Phase)}
            >
              {Object.values(Phase).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs uppercase text-gray-400 font-bold mb-1">Action Type</label>
            <select 
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
              value={type}
              onChange={(e) => setType(e.target.value as ActionType)}
            >
              <option value={ActionType.RUN_CMD}>Run Command</option>
              <option value={ActionType.WRITE_FILE}>Write File</option>
              <option value={ActionType.SERVICE}>System Service</option>
              <option value={ActionType.PACKAGE}>Install Package</option>
              <option value={ActionType.USER}>Create User</option>
            </select>
          </div>
        </div>

        <div className="bg-gray-900/50 rounded border border-gray-700 p-3 flex gap-3">
            <Info className="text-emerald-400 flex-shrink-0" size={16} />
            <div>
              <p className="text-xs text-gray-300 font-medium mb-1 leading-snug">{phaseInfo.desc}</p>
              <p className="text-[11px] text-gray-500 leading-tight">
                  <span className="text-orange-400 font-bold uppercase mr-1">Limit:</span>
                  {phaseInfo.limit}
              </p>
            </div>
        </div>
      </div>

      <div className="space-y-3">
        {type === ActionType.RUN_CMD && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">Command</label>
            <CodeEditor 
                placeholder="e.g. echo 'config' >> /etc/file&#10;systemctl restart docker"
                value={commonState.command || ''}
                onChange={(val) => updateField('command', val)}
                minHeight="min-h-[60px]"
            />
          </div>
        )}

        {type === ActionType.WRITE_FILE && (
          <>
            <div>
              <label className="block text-xs text-gray-400 mb-1">File Path</label>
              <input 
                type="text" 
                placeholder="/etc/config.conf" 
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 font-mono"
                value={commonState.path || ''}
                onChange={(e) => updateField('path', e.target.value)}
              />
            </div>
             <div className="flex gap-2">
                <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">Permissions</label>
                    <input type="text" placeholder="0644" className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 font-mono" value={commonState.permissions || ''} onChange={(e) => updateField('permissions', e.target.value)} />
                </div>
                <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">Owner</label>
                    <input type="text" placeholder="root:root" className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 font-mono" value={commonState.owner || ''} onChange={(e) => updateField('owner', e.target.value)} />
                </div>
             </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Content</label>
              <CodeEditor 
                 value={commonState.content || ''}
                 onChange={(val) => updateField('content', val)}
                 minHeight="min-h-[100px]"
              />
            </div>
          </>
        )}
        
        {type === ActionType.SERVICE && (
           <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">Service Name</label>
                <input type="text" placeholder="multipathd" className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 font-mono" value={commonState.serviceName || ''} onChange={(e) => updateField('serviceName', e.target.value)} />
              </div>
              <div className="flex-1">
                 <label className="block text-xs text-gray-400 mb-1">State</label>
                 <select className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200" value={commonState.state || 'start'} onChange={(e) => updateField('state', e.target.value)}>
                    <option value="start">Start</option>
                    <option value="restart">Restart</option>
                    <option value="stop">Stop</option>
                    <option value="enable">Enable</option>
                    <option value="disable">Disable</option>
                 </select>
              </div>
           </div>
        )}
        
        {type === ActionType.PACKAGE && (
           <div>
              <label className="block text-xs text-gray-400 mb-1">Package Name</label>
              <div className="flex items-center bg-gray-900 rounded border border-gray-700 p-2">
                <Package size={16} className="text-gray-500 mr-2" />
                <input type="text" placeholder="htop" className="bg-transparent w-full text-sm text-gray-200 font-mono focus:outline-none" value={commonState.packageName || ''} onChange={(e) => updateField('packageName', e.target.value)} />
              </div>
           </div>
        )}

        {type === ActionType.USER && (
           <>
             <div>
                <label className="block text-xs text-gray-400 mb-1">Username</label>
                <div className="flex items-center bg-gray-900 rounded border border-gray-700 p-2">
                   <User size={16} className="text-gray-500 mr-2" />
                   <input type="text" placeholder="devops" className="bg-transparent w-full text-sm text-gray-200 font-mono focus:outline-none" value={commonState.username || ''} onChange={(e) => updateField('username', e.target.value)} />
                </div>
             </div>
             <div>
                <label className="block text-xs text-gray-400 mb-1">Groups (comma separated)</label>
                <input type="text" placeholder="sudo, docker" className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 font-mono" value={commonState.groups || ''} onChange={(e) => updateField('groups', e.target.value)} />
             </div>
             <div>
                <label className="block text-xs text-gray-400 mb-1">SSH Public Key</label>
                <input type="text" placeholder="ssh-rsa AAA..." className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 font-mono" value={commonState.sshKey || ''} onChange={(e) => updateField('sshKey', e.target.value)} />
             </div>
           </>
        )}
      </div>

      <button 
        onClick={handleAdd}
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded flex items-center justify-center transition-colors shadow-lg hover:shadow-emerald-900/20"
      >
        <Plus size={18} className="mr-2" />
        Add Action
      </button>
    </div>
  );
};

export default ActionForm;