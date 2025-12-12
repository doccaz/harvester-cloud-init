import React from 'react';
import { Layers, Shield, Terminal, ExternalLink } from 'lucide-react';

const About: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto pb-20 space-y-8">
      
      {/* Harvester & SUSE Promo Section */}
      <div className="grid md:grid-cols-2 gap-8">
        
        {/* Harvester Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-xl flex flex-col items-center text-center">
            <div className="h-20 flex items-center justify-center mb-6 w-full">
                <img 
                  src="https://harvesterhci.io/img/logo_horizontal.svg" 
                  alt="Harvester" 
                  className="h-full w-auto object-contain max-w-[80%]"
                />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Harvester</h2>
            <p className="text-gray-400 mb-6 leading-relaxed">
                Harvester is a modern, open-source hyperconverged infrastructure (HCI) solution built on Kubernetes, KubeVirt, and Longhorn. It provides a familiar virtualization management interface on top of cloud-native technologies.
            </p>
            <div className="mt-auto">
                <a 
                    href="https://harvesterhci.io/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-6 py-2 bg-[#30BA78] hover:bg-[#248f5b] text-white font-bold rounded-lg transition-colors"
                >
                    Get Harvester
                    <ExternalLink size={16} className="ml-2" />
                </a>
            </div>
        </div>

        {/* SUSE Virtualization Card */}
        <div className="bg-[#0C322C] border border-[#1A453C] rounded-xl p-8 shadow-xl flex flex-col items-center text-center relative overflow-hidden">
             {/* Decorative Chameleon glow effect */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="h-20 flex items-center justify-center mb-6 w-full">
                <img 
                  src="https://d12w0ryu9hjsx8.cloudfront.net/shared-header/1.7/assets/SUSE_Logo.svg" 
                  alt="SUSE" 
                  className="h-full w-auto object-contain max-w-[80%]"
                />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">SUSE Virtualization</h2>
            <p className="text-emerald-100/80 mb-6 leading-relaxed">
                Harvester is the foundation for <strong>SUSE Virtualization</strong>, an enterprise-grade platform offering world-class support, enhanced security, and seamless Rancher integration for mission-critical workloads.
            </p>
            <div className="mt-auto">
                <a 
                    href="https://www.suse.com/products/virtualization" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-6 py-2 bg-white text-[#0C322C] hover:bg-gray-100 font-bold rounded-lg transition-colors"
                >
                    Learn More
                    <ExternalLink size={16} className="ml-2" />
                </a>
            </div>
        </div>

      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-emerald-900/50 to-gray-900 p-8 border-b border-gray-800">
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-2xl font-bold text-white">About This Tool</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-medium">
              v1.0.2
            </span>
          </div>
          <p className="text-gray-400 leading-relaxed max-w-3xl">
            The <strong>Harvester CloudInit Architect</strong> is a visual design tool for SUSE Harvester and Elemental nodes. It bridges the gap between complex YAML specifications and intuitive configuration management.
          </p>
        </div>

        <div className="p-8 space-y-10">
          
          {/* Key Features Grid */}
          <section className="grid md:grid-cols-3 gap-6">
            <div className="bg-gray-950/50 p-5 rounded-lg border border-gray-800">
              <Layers className="text-blue-400 mb-3" size={24} />
              <h4 className="font-bold text-gray-200 mb-2">Visual Composition</h4>
              <p className="text-sm text-gray-500">Drag-and-drop actions, reorder execution steps, and manage multiple configuration documents in one session.</p>
            </div>
            <div className="bg-gray-950/50 p-5 rounded-lg border border-gray-800">
              <Shield className="text-emerald-400 mb-3" size={24} />
              <h4 className="font-bold text-gray-200 mb-2">Validation & Safety</h4>
              <p className="text-sm text-gray-500">Built-in safeguards prevent common syntax errors. The AI Summary tab analyzes your config for security risks.</p>
            </div>
            <div className="bg-gray-950/50 p-5 rounded-lg border border-gray-800">
              <Terminal className="text-purple-400 mb-3" size={24} />
              <h4 className="font-bold text-gray-200 mb-2">Import & Export</h4>
              <p className="text-sm text-gray-500">Paste existing YAML to visualize it instantly. Export your work as a PDF report or raw Kubectl-ready manifests.</p>
            </div>
          </section>

          {/* Workflow */}
          <section>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <Terminal className="mr-3 text-emerald-500" />
              Workflow
            </h3>
            <ol className="relative border-l border-gray-700 ml-3 space-y-6">
              <li className="mb-10 ml-6">
                <span className="absolute flex items-center justify-center w-6 h-6 bg-emerald-900 rounded-full -left-3 ring-8 ring-gray-900">
                  <span className="text-emerald-400 text-xs font-bold">1</span>
                </span>
                <h4 className="flex items-center mb-1 text-lg font-semibold text-white">Define Targets</h4>
                <p className="mb-2 text-base font-normal text-gray-400">Use Node Selectors to determine which machines receive the configuration (e.g., by hostname or MAC address).</p>
              </li>
              <li className="mb-10 ml-6">
                <span className="absolute flex items-center justify-center w-6 h-6 bg-emerald-900 rounded-full -left-3 ring-8 ring-gray-900">
                  <span className="text-emerald-400 text-xs font-bold">2</span>
                </span>
                <h4 className="flex items-center mb-1 text-lg font-semibold text-white">Add Actions</h4>
                <p className="mb-2 text-base font-normal text-gray-400">Add users, write configuration files, or install packages. Choose the correct <strong>Phase</strong> to ensure they run at the right time.</p>
              </li>
              <li className="ml-6">
                <span className="absolute flex items-center justify-center w-6 h-6 bg-emerald-900 rounded-full -left-3 ring-8 ring-gray-900">
                  <span className="text-emerald-400 text-xs font-bold">3</span>
                </span>
                <h4 className="flex items-center mb-1 text-lg font-semibold text-white">Preview & Apply</h4>
                <p className="mb-2 text-base font-normal text-gray-400">Switch to the YAML Preview tab, download the file, and apply it to your cluster via <code>kubectl apply -f</code>.</p>
              </li>
            </ol>
          </section>

        </div>
      </div>
    </div>
  );
};

export default About;