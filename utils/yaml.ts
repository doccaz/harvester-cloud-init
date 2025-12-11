import { CloudInitConfig, ActionType, Phase, CloudAction, WriteFileAction, RunCmdAction, PackageAction, UserAction, ServiceAction } from '../types';

// Helper to indent text
const indentText = (text: string, spaces: number): string => {
  const padding = ' '.repeat(spaces);
  return text.split('\n').map(line => line ? padding + line : line).join('\n');
};

const formatMultiline = (str: string, baseIndent: number): string => {
  const indent = ' '.repeat(baseIndent);
  return `|\n${str.split('\n').map(l => `${indent}${l}`).join('\n')}`;
};

const generateSingleConfigYaml = (config: CloudInitConfig): string => {
  // 1. Generate the Inner Elemental Config (The "contents")
  let innerYaml = `stages:\n`;

  const actionsByPhase = config.actions.reduce((acc, action) => {
    const key = action.phase;
    if (!acc[key]) acc[key] = [];
    acc[key].push(action);
    return acc;
  }, {} as Record<Phase, CloudAction[]>);

  const phaseMap: Record<Phase, string> = {
    [Phase.GLOBAL]: 'initramfs',
    [Phase.BOOT]: 'boot',
    [Phase.NETWORK]: 'network',
    [Phase.PRE_INSTALL]: 'pre-install',
    [Phase.POST_INSTALL]: 'post-install',
  };

  Object.values(Phase).forEach(phase => {
    const actions = actionsByPhase[phase];
    if (!actions || actions.length === 0) return;

    const yamlKey = phaseMap[phase] || 'unknown';
    innerYaml += `  ${yamlKey}:\n`;

    actions.forEach(action => {
      innerYaml += `    - name: "Action: ${action.type}"\n`;
      
      switch (action.type) {
        case ActionType.WRITE_FILE: {
          const act = action as WriteFileAction;
          innerYaml += `      files:\n`;
          innerYaml += `        - path: ${act.path}\n`;
          innerYaml += `          permissions: "${act.permissions}"\n`;
          innerYaml += `          owner: "${act.owner}"\n`;
          
          if (act.encoding === 'base64') {
             innerYaml += `          encoding: b64\n`;
             innerYaml += `          content: ${act.content}\n`;
          } else {
             // Handle multiline content for file
             if (act.content.includes('\n')) {
                 innerYaml += `          content: ${formatMultiline(act.content, 12)}\n`; 
             } else {
                 innerYaml += `          content: "${act.content.replace(/"/g, '\\"')}"\n`;
             }
          }
          break;
        }
        case ActionType.RUN_CMD: {
          const act = action as RunCmdAction;
          innerYaml += `      commands:\n`;
          if (act.command.includes('\n')) {
             // Use block scalar for multi-line commands
             // We are inside "      commands:" (indent 6) -> list item (indent 8) -> content (indent 10)
             innerYaml += `        - ${formatMultiline(act.command, 10)}\n`; 
          } else {
             innerYaml += `        - "${act.command.replace(/"/g, '\\"')}"\n`;
          }
          break;
        }
        case ActionType.PACKAGE: {
          const act = action as PackageAction;
          innerYaml += `      commands:\n`;
          innerYaml += `        - "zypper install -y ${act.packageName}"\n`; 
          break;
        }
        case ActionType.SERVICE: {
            const act = action as ServiceAction;
            innerYaml += `      systemctl:\n`;
            innerYaml += `        ${act.state}:\n`;
            innerYaml += `          - ${act.serviceName}\n`;
            break;
        }
        case ActionType.USER: {
             const act = action as UserAction;
             innerYaml += `      users:\n`;
             innerYaml += `        ${act.username}:\n`;
             if(act.groups) innerYaml += `          groups: ${act.groups}\n`;
             if(act.sshKey) {
                 innerYaml += `          ssh_authorized_keys:\n`;
                 innerYaml += `            - "${act.sshKey}"\n`;
             }
             break;
        }
      }
    });
  });

  // 2. Generate the Harvester CRD Wrapper
  let crd = `apiVersion: node.harvesterhci.io/v1beta1\n`;
  crd += `kind: CloudInit\n`;
  crd += `metadata:\n`;
  crd += `  name: ${config.name || 'unnamed-config'}\n`;
  crd += `  namespace: harvester-system\n`;
  crd += `spec:\n`;
  crd += `  matchSelector:\n`;
  
  if (config.selectors.length > 0) {
    config.selectors.forEach(sel => {
      // Harvester matchSelector uses simple Key: Value matching
      crd += `    ${sel.key}: ${sel.value || ''}\n`; 
    });
  } else {
      crd += `    {}\n`;
  }

  crd += `  filename: 99_${(config.name || 'custom').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.yaml\n`;
  crd += `  contents: |\n`;
  
  // Indent inner yaml by 4 spaces
  crd += indentText(innerYaml, 4);

  return crd;
};

export const generateYaml = (configs: CloudInitConfig[]): string => {
  return configs.map(generateSingleConfigYaml).join('\n---\n');
};