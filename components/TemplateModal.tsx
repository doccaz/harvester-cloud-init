import React, { useState } from 'react';
import { ActionType, Phase, CloudAction, WriteFileAction, RunCmdAction, ServiceAction } from '../types';
import { X, Server, Network, FileText, Terminal, Check, ChevronRight, Lock, HardDrive, Trash2, AlertCircle } from 'lucide-react';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddActions: (actions: CloudAction[]) => void;
}

interface VP {
    vendor: string;
    product: string;
}

const TemplateModal: React.FC<TemplateModalProps> = ({ isOpen, onClose, onAddActions }) => {
  const [activeTemplate, setActiveTemplate] = useState<'kernel' | 'vlan' | 'sftp' | 'ndm' | null>(null);
  
  // Kernel/Grub Params State
  const [kernelParams, setKernelParams] = useState('');
  const [grubEntry, setGrubEntry] = useState('');

  // VLAN State
  const [vlanParent, setVlanParent] = useState('eth0'); // Physical or existing parent
  const [vlanId, setVlanId] = useState('');
  const [vlanName, setVlanName] = useState(''); // New: Custom VLAN Connection Name
  const [vlanIp, setVlanIp] = useState('');
  const [vlanGw, setVlanGw] = useState('');
  const [vlanDns, setVlanDns] = useState('');
  const [createParentBridge, setCreateParentBridge] = useState(false);
  const [bridgeName, setBridgeName] = useState('mgmt-br'); // New: Custom Bridge Name
  const [vlanMethod, setVlanMethod] = useState<'nmcli' | 'file'>('file');

  // External Disk (NDM) State
  const [ndmBlacklistVP, setNdmBlacklistVP] = useState<VP[]>([]);
  const [ndmBlacklistWwid, setNdmBlacklistWwid] = useState<string[]>([]);
  const [ndmExceptionVP, setNdmExceptionVP] = useState<VP[]>([]);
  const [ndmExceptionWwid, setNdmExceptionWwid] = useState<string[]>([]);
  const [ndmDefaults, setNdmDefaults] = useState(true);

  // Temp inputs for NDM
  const [ndmVendor, setNdmVendor] = useState('');
  const [ndmProduct, setNdmProduct] = useState('');
  const [ndmWwid, setNdmWwid] = useState('');

  if (!isOpen) return null;

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleApply = () => {
    const actions: CloudAction[] = [];

    if (activeTemplate === 'kernel') {
       if (!kernelParams && !grubEntry) return;

       // Updated to match Harvester HCI docs: use grub2-editenv on cos-state
       let cmd = 'mount -o remount,rw /run/initramfs/cos-state';
       let editEnvCmd = 'grub2-editenv /run/initramfs/cos-state/grub_oem_env set';
       
       // Build the set command with available values
       if (kernelParams) editEnvCmd += ` extra_cmdline="${kernelParams.trim()}"`;
       if (grubEntry) editEnvCmd += ` saved_entry="${grubEntry.trim()}"`;
       
       actions.push({
         id: generateId(),
         phase: Phase.NETWORK, // Needs to run when OS is up and filesystem is accessible
         type: ActionType.RUN_CMD,
         command: `${cmd} && ${editEnvCmd}`
       } as RunCmdAction);
    } 
    else if (activeTemplate === 'sftp') {
        actions.push({
            id: generateId(),
            phase: Phase.NETWORK,
            type: ActionType.WRITE_FILE,
            path: '/etc/ssh/sshd_config.d/sftp.conf',
            content: 'Subsystem sftp internal-sftp',
            permissions: '0644',
            owner: 'root:root',
            encoding: 'text'
        } as WriteFileAction);
    }
    else if (activeTemplate === 'ndm') {
        const hasBlacklist = ndmBlacklistVP.length > 0 || ndmBlacklistWwid.length > 0;
        const hasExceptions = ndmExceptionVP.length > 0 || ndmExceptionWwid.length > 0;

        // Even if no blacklist/exceptions, user might just want defaults
        if (!hasBlacklist && !hasExceptions && !ndmDefaults) return;

        let content = '';
        
        if (ndmDefaults) {
            content += 'defaults {\n    user_friendly_names yes\n    find_multipaths yes\n}\n\n';
        }

        if (hasBlacklist) {
            content += 'blacklist {\n';
            ndmBlacklistVP.forEach(vp => {
                content += `    device {\n        vendor "${vp.vendor}"\n        product "${vp.product}"\n    }\n`;
            });
            ndmBlacklistWwid.forEach(wwid => {
                content += `    wwid "${wwid}"\n`;
            });
            content += '}\n\n';
        }

        if (hasExceptions) {
            content += 'blacklist_exceptions {\n';
            ndmExceptionVP.forEach(vp => {
                content += `    device {\n        vendor "${vp.vendor}"\n        product "${vp.product}"\n    }\n`;
            });
            ndmExceptionWwid.forEach(wwid => {
                content += `    wwid "${wwid}"\n`;
            });
            content += '}\n';
        }

        // Action 1: Write /etc/multipath.conf
        actions.push({
            id: generateId(),
            phase: Phase.NETWORK, 
            type: ActionType.WRITE_FILE,
            path: '/etc/multipath.conf',
            content: content.trim(),
            permissions: '0644',
            owner: 'root:root',
            encoding: 'text'
        } as WriteFileAction);

        // Action 2: Enable multipathd
        actions.push({
            id: generateId(),
            phase: Phase.NETWORK,
            type: ActionType.SERVICE,
            serviceName: 'multipathd',
            state: 'enable'
        } as ServiceAction);

        // Action 3: Start multipathd
        actions.push({
            id: generateId(),
            phase: Phase.NETWORK,
            type: ActionType.SERVICE,
            serviceName: 'multipathd',
            state: 'start'
        } as ServiceAction);
    }
    else if (activeTemplate === 'vlan') {
       if (!vlanId || !vlanIp) return;
       
       const finalVlanName = vlanName || `vlan-${vlanId}`;
       const finalParent = createParentBridge ? bridgeName : vlanParent;
       
       if (createParentBridge) {
          const bridgeConnId = `bridge-${bridgeName}`;
          if (vlanMethod === 'file') {
             let bridgeContent = `[connection]\nid=${bridgeConnId}\ntype=bridge\ninterface-name=${bridgeName}\n\n`;
             bridgeContent += `[ethernet]\n\n`;
             bridgeContent += `[bridge]\nforward-delay=0\nstp=false\nvlan-filtering=true\nvlan-default-pvid=1\nvlans=${vlanId}\n\n`;
             bridgeContent += `[ipv4]\nmethod=disabled\n\n`;
             bridgeContent += `[ipv6]\nmethod=disabled\n`;

             actions.push({
                 id: generateId(),
                 phase: Phase.POST_INSTALL,
                 type: ActionType.WRITE_FILE,
                 path: `/etc/NetworkManager/system-connections/${bridgeConnId}.nmconnection`,
                 content: bridgeContent,
                 permissions: '0600',
                 owner: 'root:root',
                 encoding: 'text'
             } as WriteFileAction);
          } else {
             actions.push({
                 id: generateId(),
                 phase: Phase.BOOT,
                 type: ActionType.RUN_CMD,
                 command: `nmcli con add type bridge con-name ${bridgeConnId} ifname ${bridgeName} bridge.vlan-filtering yes bridge.vlans ${vlanId} ipv4.method disabled ipv6.method disabled`
             });
          }
       }

       if (vlanMethod === 'file') {
           let content = `[connection]\nid=${finalVlanName}\ntype=vlan\n\n`;
           content += `[ethernet]\n\n`;
           content += `[vlan]\nflags=1\nid=${vlanId}\nparent=${finalParent}\n\n`;
           content += `[ipv4]\nmethod=manual\naddress1=${vlanIp}`;
           if (vlanGw) content += `,${vlanGw}`;
           if (vlanDns) {
               const formattedDns = vlanDns.split(/[ ,;]+/).filter(Boolean).join(';') + ';';
               content += `\ndns=${formattedDns}`;
           }
           content += `\n\n[ipv6]\nmethod=disabled\n`;
           
           actions.push({
               id: generateId(),
               phase: Phase.POST_INSTALL,
               type: ActionType.WRITE_FILE,
               path: `/etc/NetworkManager/system-connections/${finalVlanName}.nmconnection`,
               content,
               permissions: '0600',
               owner: 'root:root',
               encoding: 'text'
           } as WriteFileAction);
       } else {
           let cmd = `nmcli con add type vlan con-name ${finalVlanName} dev ${finalParent} id ${vlanId} ip4 ${vlanIp}`;
           if (vlanGw) cmd += ` gw4 ${vlanGw}`;
           if (vlanDns) {
               const formattedDns = vlanDns.split(/[ ,;]+/).filter(Boolean).join(' ');
               cmd += ` ipv4.dns "${formattedDns}"`;
           }
           actions.push({
               id: generateId(),
               phase: Phase.BOOT,
               type: ActionType.RUN_CMD,
               command: cmd
           } as RunCmdAction);
       }
    }

    onAddActions(actions);
    onClose();
    // Reset all state
    setActiveTemplate(null);
    setKernelParams('');
    setGrubEntry('');
    setVlanParent('eth0');
    setVlanId('');
    setVlanName('');
    setVlanIp('');
    setVlanGw('');
    setVlanDns('');
    setCreateParentBridge(false);
    setBridgeName('mgmt-br');
    // Reset NDM
    setNdmBlacklistVP([]);
    setNdmBlacklistWwid([]);
    setNdmExceptionVP([]);
    setNdmExceptionWwid([]);
    setNdmDefaults(true);
    setNdmVendor('');
    setNdmProduct('');
    setNdmWwid('');
  };

  const addNdmVP = (type: 'blacklist' | 'whitelist') => {
      if (!ndmVendor || !ndmProduct) return;
      const newItem: VP = { vendor: ndmVendor, product: ndmProduct };
      if (type === 'blacklist') {
          setNdmBlacklistVP([...ndmBlacklistVP, newItem]);
      } else {
          setNdmExceptionVP([...ndmExceptionVP, newItem]);
      }
      setNdmVendor('');
      setNdmProduct('');
  };

  const addNdmWwid = (type: 'blacklist' | 'whitelist') => {
      if (!ndmWwid) return;
      if (type === 'blacklist') {
          setNdmBlacklistWwid([...ndmBlacklistWwid, ndmWwid]);
      } else {
          setNdmExceptionWwid([...ndmExceptionWwid, ndmWwid]);
      }
      setNdmWwid('');
  };

  const removeNdmItem = (listName: 'blVP' | 'blWwid' | 'exVP' | 'exWwid', index: number) => {
      if (listName === 'blVP') setNdmBlacklistVP(ndmBlacklistVP.filter((_, i) => i !== index));
      if (listName === 'blWwid') setNdmBlacklistWwid(ndmBlacklistWwid.filter((_, i) => i !== index));
      if (listName === 'exVP') setNdmExceptionVP(ndmExceptionVP.filter((_, i) => i !== index));
      if (listName === 'exWwid') setNdmExceptionWwid(ndmExceptionWwid.filter((_, i) => i !== index));
  };

  const hasNdmConfig = ndmBlacklistVP.length > 0 || ndmBlacklistWwid.length > 0 || ndmExceptionVP.length > 0 || ndmExceptionWwid.length > 0 || ndmDefaults;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
           <h3 className="text-lg font-bold text-white flex items-center">
             <Server className="mr-2 text-emerald-400" size={20} />
             Template Library
           </h3>
           <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
             <X size={20} />
           </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
           {/* Sidebar */}
           <div className="w-1/3 border-r border-gray-700 bg-gray-900/30 p-2 space-y-1 overflow-y-auto">
              <button 
                onClick={() => setActiveTemplate('kernel')}
                className={`w-full text-left px-3 py-3 rounded-lg flex items-center justify-between group transition-colors ${activeTemplate === 'kernel' ? 'bg-emerald-900/30 border border-emerald-500/30 text-emerald-100' : 'hover:bg-gray-700/50 text-gray-400'}`}
              >
                 <div className="flex items-center">
                    <Terminal size={16} className="mr-2" />
                    <span className="text-sm font-medium">Grub / Kernel Config</span>
                 </div>
                 {activeTemplate === 'kernel' && <ChevronRight size={14} className="text-emerald-400" />}
              </button>

              <button 
                onClick={() => setActiveTemplate('vlan')}
                className={`w-full text-left px-3 py-3 rounded-lg flex items-center justify-between group transition-colors ${activeTemplate === 'vlan' ? 'bg-emerald-900/30 border border-emerald-500/30 text-emerald-100' : 'hover:bg-gray-700/50 text-gray-400'}`}
              >
                 <div className="flex items-center">
                    <Network size={16} className="mr-2" />
                    <span className="text-sm font-medium">Configure VLAN</span>
                 </div>
                 {activeTemplate === 'vlan' && <ChevronRight size={14} className="text-emerald-400" />}
              </button>

              <button 
                onClick={() => setActiveTemplate('sftp')}
                className={`w-full text-left px-3 py-3 rounded-lg flex items-center justify-between group transition-colors ${activeTemplate === 'sftp' ? 'bg-emerald-900/30 border border-emerald-500/30 text-emerald-100' : 'hover:bg-gray-700/50 text-gray-400'}`}
              >
                 <div className="flex items-center">
                    <Lock size={16} className="mr-2" />
                    <span className="text-sm font-medium">Enable SFTP</span>
                 </div>
                 {activeTemplate === 'sftp' && <ChevronRight size={14} className="text-emerald-400" />}
              </button>

              <button 
                onClick={() => setActiveTemplate('ndm')}
                className={`w-full text-left px-3 py-3 rounded-lg flex items-center justify-between group transition-colors ${activeTemplate === 'ndm' ? 'bg-emerald-900/30 border border-emerald-500/30 text-emerald-100' : 'hover:bg-gray-700/50 text-gray-400'}`}
              >
                 <div className="flex items-center">
                    <HardDrive size={16} className="mr-2" />
                    <span className="text-sm font-medium">External Disks</span>
                 </div>
                 {activeTemplate === 'ndm' && <ChevronRight size={14} className="text-emerald-400" />}
              </button>
           </div>

           {/* Content */}
           <div className="flex-1 p-6 overflow-y-auto bg-gray-800">
              {!activeTemplate && (
                 <div className="h-full flex flex-col items-center justify-center text-gray-500 text-center p-4">
                    <Server size={48} className="mb-4 opacity-20" />
                    <p>Select a template from the sidebar to configure.</p>
                 </div>
              )}

              {activeTemplate === 'kernel' && (
                 <div className="space-y-4 animate-in slide-in-from-right-4 duration-200">
                    <h4 className="text-white font-bold text-lg mb-2">Grub & Kernel Configuration</h4>
                    <p className="text-xs text-gray-400 mb-4">
                       Modifies the <code>grub_oem_env</code> file in <code>/run/initramfs/cos-state</code> to update kernel parameters or changing the default boot entry.
                    </p>
                    
                    <div>
                       <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Kernel Parameters (extra_cmdline)</label>
                       <input 
                         className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 font-mono focus:border-emerald-500 focus:outline-none"
                         placeholder="intel_iommu=on hugepages=1024"
                         value={kernelParams}
                         onChange={e => setKernelParams(e.target.value)}
                       />
                       <p className="text-[10px] text-gray-500 mt-1">Appended to the kernel command line during boot.</p>
                    </div>

                    <div className="pt-2">
                       <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Default Boot Entry (saved_entry)</label>
                       <input 
                         className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 font-mono focus:border-emerald-500 focus:outline-none"
                         placeholder="debug"
                         value={grubEntry}
                         onChange={e => setGrubEntry(e.target.value)}
                       />
                       <p className="text-[10px] text-gray-500 mt-1">
                          Sets the ID of the default menu entry (e.g. <code>debug</code>). Leave empty to keep default.
                       </p>
                    </div>
                 </div>
              )}

              {activeTemplate === 'sftp' && (
                  <div className="space-y-4 animate-in slide-in-from-right-4 duration-200">
                    <h4 className="text-white font-bold text-lg mb-2">Enable SFTP Support</h4>
                    <p className="text-xs text-gray-400 mb-4">
                       Configures the SSH daemon to support SFTP by creating <code>/etc/ssh/sshd_config.d/sftp.conf</code>.
                    </p>
                    <div className="bg-gray-900/50 border border-gray-700 rounded p-4 text-sm text-gray-300">
                        <p className="mb-2 font-bold text-white">File Content:</p>
                        <code className="text-emerald-400 font-mono">Subsystem sftp internal-sftp</code>
                    </div>
                  </div>
              )}

              {activeTemplate === 'ndm' && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-200">
                    <div>
                        <h4 className="text-white font-bold text-lg mb-1">External Disk Support</h4>
                        <p className="text-xs text-gray-400 mb-2">
                        Configure <code>multipath.conf</code> to filter devices and enable <code>multipathd</code>.
                        </p>
                        <div className="bg-amber-900/20 border border-amber-800 rounded p-2 flex items-start">
                             <AlertCircle size={14} className="text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
                             <p className="text-[10px] text-amber-200/80">
                                This will write to <code>/etc/multipath.conf</code> and enable the service in the Network stage.
                             </p>
                        </div>
                    </div>

                    <div className="bg-gray-900/50 rounded border border-gray-700 p-3">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={ndmDefaults}
                                onChange={e => setNdmDefaults(e.target.checked)}
                                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 bg-gray-700 border-gray-600"
                            />
                            <span className="text-sm font-medium text-gray-200">Include Default Configuration?</span>
                        </label>
                        {ndmDefaults && (
                             <p className="text-[10px] text-gray-500 mt-1 ml-6 font-mono">
                                defaults &#123; user_friendly_names yes; find_multipaths yes &#125;
                             </p>
                        )}
                    </div>

                    {/* Section 1: Add by Vendor / Product */}
                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 space-y-3">
                        <label className="block text-xs uppercase text-emerald-400 font-bold">Add by Vendor & Product</label>
                        <div className="grid grid-cols-2 gap-2">
                             <input 
                                className="bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
                                placeholder="Vendor (e.g. !QEMU)"
                                value={ndmVendor}
                                onChange={e => setNdmVendor(e.target.value)}
                             />
                             <input 
                                className="bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
                                placeholder="Product (e.g. !QEMU HARDDISK)"
                                value={ndmProduct}
                                onChange={e => setNdmProduct(e.target.value)}
                             />
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => addNdmVP('blacklist')}
                                disabled={!ndmVendor || !ndmProduct}
                                className="flex-1 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 text-xs rounded font-medium transition-colors disabled:opacity-50"
                            >
                                + Add to Blacklist
                            </button>
                            <button 
                                onClick={() => addNdmVP('whitelist')}
                                disabled={!ndmVendor || !ndmProduct}
                                className="flex-1 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 text-xs rounded font-medium transition-colors disabled:opacity-50"
                            >
                                + Add to Exceptions
                            </button>
                        </div>
                    </div>

                    {/* Section 2: Add by WWID */}
                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 space-y-3">
                        <label className="block text-xs uppercase text-emerald-400 font-bold">Add by WWID</label>
                        <input 
                            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
                            placeholder="WWID (e.g. .*, ^0QEMU.*)"
                            value={ndmWwid}
                            onChange={e => setNdmWwid(e.target.value)}
                        />
                        <div className="flex gap-2">
                            <button 
                                onClick={() => addNdmWwid('blacklist')}
                                disabled={!ndmWwid}
                                className="flex-1 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 text-xs rounded font-medium transition-colors disabled:opacity-50"
                            >
                                + Add to Blacklist
                            </button>
                            <button 
                                onClick={() => addNdmWwid('whitelist')}
                                disabled={!ndmWwid}
                                className="flex-1 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 text-xs rounded font-medium transition-colors disabled:opacity-50"
                            >
                                + Add to Exceptions
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 pt-2">
                        {/* Blacklist Render */}
                        {(ndmBlacklistVP.length > 0 || ndmBlacklistWwid.length > 0) && (
                            <div className="bg-red-900/10 border border-red-900/30 rounded p-2">
                                <h5 className="text-xs uppercase text-red-400 font-bold mb-2">Blacklist Rules</h5>
                                <div className="space-y-1">
                                    {ndmBlacklistVP.map((item, idx) => (
                                        <div key={`vp-${idx}`} className="flex justify-between items-center bg-gray-900/50 rounded px-2 py-1">
                                            <span className="text-[10px] text-gray-400 font-mono">
                                                V: <span className="text-gray-200">{item.vendor}</span> / P: <span className="text-gray-200">{item.product}</span>
                                            </span>
                                            <button onClick={() => removeNdmItem('blVP', idx)} className="text-gray-500 hover:text-red-400"><Trash2 size={12} /></button>
                                        </div>
                                    ))}
                                    {ndmBlacklistWwid.map((item, idx) => (
                                        <div key={`wwid-${idx}`} className="flex justify-between items-center bg-gray-900/50 rounded px-2 py-1">
                                            <span className="text-[10px] text-gray-400 font-mono">
                                                WWID: <span className="text-gray-200">{item}</span>
                                            </span>
                                            <button onClick={() => removeNdmItem('blWwid', idx)} className="text-gray-500 hover:text-red-400"><Trash2 size={12} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Whitelist Render */}
                        {(ndmExceptionVP.length > 0 || ndmExceptionWwid.length > 0) && (
                            <div className="bg-emerald-900/10 border border-emerald-900/30 rounded p-2">
                                <h5 className="text-xs uppercase text-emerald-400 font-bold mb-2">Exceptions (Whitelist)</h5>
                                <div className="space-y-1">
                                    {ndmExceptionVP.map((item, idx) => (
                                        <div key={`vp-${idx}`} className="flex justify-between items-center bg-gray-900/50 rounded px-2 py-1">
                                            <span className="text-[10px] text-gray-400 font-mono">
                                                V: <span className="text-gray-200">{item.vendor}</span> / P: <span className="text-gray-200">{item.product}</span>
                                            </span>
                                            <button onClick={() => removeNdmItem('exVP', idx)} className="text-gray-500 hover:text-red-400"><Trash2 size={12} /></button>
                                        </div>
                                    ))}
                                    {ndmExceptionWwid.map((item, idx) => (
                                        <div key={`wwid-${idx}`} className="flex justify-between items-center bg-gray-900/50 rounded px-2 py-1">
                                            <span className="text-[10px] text-gray-400 font-mono">
                                                WWID: <span className="text-gray-200">{item}</span>
                                            </span>
                                            <button onClick={() => removeNdmItem('exWwid', idx)} className="text-gray-500 hover:text-red-400"><Trash2 size={12} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                  </div>
              )}

              {activeTemplate === 'vlan' && (
                 <div className="space-y-4 animate-in slide-in-from-right-4 duration-200">
                    <h4 className="text-white font-bold text-lg mb-2">Network Interface (VLAN)</h4>
                    <p className="text-xs text-gray-400 mb-4">
                       Configures a VLAN interface with a static IP address.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Parent Interface</label>
                           <input 
                             className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 font-mono focus:border-emerald-500 focus:outline-none"
                             placeholder="eth0 or mgmt-br"
                             value={vlanParent}
                             onChange={e => setVlanParent(e.target.value)}
                           />
                        </div>
                        <div>
                           <label className="block text-xs uppercase text-gray-500 font-bold mb-1">VLAN ID</label>
                           <input 
                             className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 font-mono focus:border-emerald-500 focus:outline-none"
                             placeholder="100"
                             value={vlanId}
                             onChange={e => setVlanId(e.target.value)}
                           />
                        </div>
                    </div>

                    <div>
                       <label className="block text-xs uppercase text-gray-500 font-bold mb-1">VLAN Interface Name</label>
                       <input 
                         className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 font-mono focus:border-emerald-500 focus:outline-none"
                         placeholder={`vlan-${vlanId || '100'}`}
                         value={vlanName}
                         onChange={e => setVlanName(e.target.value)}
                       />
                       <p className="text-[10px] text-gray-500 mt-1">Defaults to <code>vlan-{vlanId || 'ID'}</code> if empty.</p>
                    </div>

                    <div>
                       <label className="block text-xs uppercase text-gray-500 font-bold mb-1">IP Address (CIDR)</label>
                       <input 
                         className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 font-mono focus:border-emerald-500 focus:outline-none"
                         placeholder="192.168.10.5/24"
                         value={vlanIp}
                         onChange={e => setVlanIp(e.target.value)}
                       />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Gateway (Optional)</label>
                           <input 
                             className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 font-mono focus:border-emerald-500 focus:outline-none"
                             placeholder="192.168.10.1"
                             value={vlanGw}
                             onChange={e => setVlanGw(e.target.value)}
                           />
                        </div>
                        <div>
                           <label className="block text-xs uppercase text-gray-500 font-bold mb-1">DNS (Optional)</label>
                           <input 
                             className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 font-mono focus:border-emerald-500 focus:outline-none"
                             placeholder="8.8.8.8, 1.1.1.1"
                             value={vlanDns}
                             onChange={e => setVlanDns(e.target.value)}
                           />
                        </div>
                    </div>

                    <div className="bg-gray-900/50 rounded border border-gray-700 p-3 mt-2">
                        <label className="flex items-center space-x-2 cursor-pointer mb-2">
                            <input 
                                type="checkbox" 
                                checked={createParentBridge}
                                onChange={e => setCreateParentBridge(e.target.checked)}
                                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 bg-gray-700 border-gray-600"
                            />
                            <span className="text-sm font-medium text-gray-200">Configure Parent as Bridge?</span>
                        </label>
                        {createParentBridge && (
                             <div className="ml-6 space-y-2">
                                <p className="text-xs text-gray-500">
                                   Generates a Bridge configuration. The VLAN will be attached to this bridge.
                                </p>
                                <div>
                                   <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Bridge Interface Name</label>
                                   <input 
                                     className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 font-mono focus:border-emerald-500 focus:outline-none"
                                     placeholder="mgmt-br"
                                     value={bridgeName}
                                     onChange={e => setBridgeName(e.target.value)}
                                   />
                                </div>
                             </div>
                        )}
                    </div>

                    <div className="pt-2">
                        <label className="block text-xs uppercase text-gray-500 font-bold mb-2">Configuration Method</label>
                        <div className="flex gap-4">
                           <label className="flex items-center cursor-pointer">
                              <input type="radio" name="method" value="file" checked={vlanMethod === 'file'} onChange={() => setVlanMethod('file')} className="hidden" />
                              <div className={`flex items-center px-3 py-2 rounded border transition-colors ${vlanMethod === 'file' ? 'bg-emerald-900/20 border-emerald-500 text-emerald-400' : 'bg-gray-900 border-gray-700 text-gray-400'}`}>
                                 <FileText size={16} className="mr-2" />
                                 <span className="text-sm">Create .nmconnection File(s)</span>
                              </div>
                           </label>
                           <label className="flex items-center cursor-pointer">
                              <input type="radio" name="method" value="nmcli" checked={vlanMethod === 'nmcli'} onChange={() => setVlanMethod('nmcli')} className="hidden" />
                              <div className={`flex items-center px-3 py-2 rounded border transition-colors ${vlanMethod === 'nmcli' ? 'bg-emerald-900/20 border-emerald-500 text-emerald-400' : 'bg-gray-900 border-gray-700 text-gray-400'}`}>
                                 <Terminal size={16} className="mr-2" />
                                 <span className="text-sm">Run nmcli Commands</span>
                              </div>
                           </label>
                        </div>
                    </div>
                 </div>
              )}
           </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex justify-end gap-3 bg-gray-900/50">
           <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
              Cancel
           </button>
           <button 
             onClick={handleApply}
             disabled={!activeTemplate || (activeTemplate === 'ndm' && !hasNdmConfig)}
             className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg transition-colors flex items-center shadow-lg"
           >
              <Check size={16} className="mr-2" />
              Generate Actions
           </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateModal;