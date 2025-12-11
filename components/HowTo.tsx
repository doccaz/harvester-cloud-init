import React from 'react';
import { Terminal, Copy, Check, FileCode, Server } from 'lucide-react';

const CodeBlock = ({ code }: { code: string }) => {
  const [copied, setCopied] = React.useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-gray-900 border border-gray-800 rounded-lg p-4 font-mono text-sm text-green-300 overflow-x-auto selection:bg-green-900">
        {code}
      </pre>
      <button 
        onClick={copy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-800 text-gray-400 opacity-0 group-hover:opacity-100 transition-all hover:text-white"
        title="Copy to clipboard"
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>
    </div>
  );
};

const HowTo: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
            <Server className="mr-3 text-emerald-500" />
            Applying to Harvester
        </h2>
        <p className="text-gray-300 mb-6 leading-relaxed">
            The generated YAML contains <strong>Kubernetes Custom Resources</strong> (CRDs) of kind <code>CloudInit</code>. 
            These resources tell Harvester to inject specific configurations into the underlying operating system of your nodes.
        </p>

        <div className="space-y-8">
            <div className="space-y-3">
                <h3 className="text-lg font-medium text-emerald-400 flex items-center">
                    <FileCode size={20} className="mr-2" />
                    Step 1: Save the configuration
                </h3>
                <p className="text-sm text-gray-400">Copy the YAML from the <strong>Preview</strong> tab and save it to a file, for example <code>cloud-config.yaml</code>.</p>
            </div>

            <div className="space-y-3">
                <h3 className="text-lg font-medium text-emerald-400 flex items-center">
                    <Terminal size={20} className="mr-2" />
                    Step 2: Apply with Kubectl
                </h3>
                <p className="text-sm text-gray-400">Apply the configuration to your Harvester cluster. This will create or update the resources.</p>
                <CodeBlock code="kubectl apply -f cloud-config.yaml" />
            </div>

            <div className="space-y-3">
                <h3 className="text-lg font-medium text-emerald-400 flex items-center">
                    <Check size={20} className="mr-2" />
                    Step 3: Verify Creation
                </h3>
                <p className="text-sm text-gray-400">Check that the resources were created successfully in the <code>harvester-system</code> namespace.</p>
                <CodeBlock code="kubectl get cloudinit -n harvester-system" />
            </div>
        </div>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8">
         <h2 className="text-xl font-bold text-white mb-4">Management & Debugging</h2>
         
         <div className="space-y-6">
            <div>
                <h4 className="font-bold text-gray-200 mb-2">Updating Configurations</h4>
                <p className="text-sm text-gray-400 mb-2">
                    CloudInit resources in Harvester are <strong>immutable</strong> in effect. Editing the CRD will NOT re-run the cloud-init stages on already running nodes unless you reboot or manually trigger a re-apply.
                </p>
                <p className="text-sm text-gray-400">
                    For changes to take effect on existing nodes, a reboot is usually required:
                </p>
            </div>

            <div>
                <h4 className="font-bold text-gray-200 mb-2">Removing Configurations</h4>
                <p className="text-sm text-gray-400 mb-2">To remove a configuration, delete the CRD. Note that this <strong>does not revert</strong> changes already made to the nodes (like files created or packages installed).</p>
                <CodeBlock code="kubectl delete cloudinit -n harvester-system [config-name]" />
            </div>
         </div>
      </div>

    </div>
  );
};

export default HowTo;