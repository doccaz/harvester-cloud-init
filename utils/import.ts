/*
 * Copyright (C) 2026 Erico Mendonca
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import * as jsyaml from 'js-yaml';
import { CloudInitConfig, Phase, ActionType, CloudAction, NodeSelector } from '../types';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  configs: CloudInitConfig[];
}

// Reverse mapping for phases
const phaseMap: Record<string, Phase> = {
  'initramfs': Phase.GLOBAL,
  'boot': Phase.BOOT,
  'network': Phase.NETWORK,
  'pre-install': Phase.PRE_INSTALL,
  'post-install': Phase.POST_INSTALL,
};

const parseConfigObject = (configRoot: any, index: number): { config: CloudInitConfig, errors: string[], warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];
    let configName = configRoot.name || `imported-config-${index + 1}`;
    let selectorsInput = configRoot.match; 
    let actions: CloudAction[] = [];
    let selectors: NodeSelector[] = [];
    let stagesRoot = configRoot.stages; // Default for raw Elemental

    // Check if it's a Kubernetes CRD (Harvester CloudInit)
    const isCRD = configRoot.kind === 'CloudInit' && (configRoot.apiVersion?.includes('harvesterhci.io') || true);

    if (isCRD) {
        if (!configRoot.spec) {
            errors.push(`Doc ${index + 1}: CRD missing "spec" field`);
        } else {
            configName = configRoot.metadata?.name || `harvester-cloudinit-${index + 1}`;
            selectorsInput = configRoot.spec.matchSelector;
            
            if (configRoot.spec.contents) {
                try {
                    const inner = jsyaml.load(configRoot.spec.contents) as any;
                    stagesRoot = inner?.stages;
                } catch (e: any) {
                    errors.push(`Doc ${index + 1}: Failed to parse nested YAML in spec.contents: ${e.message}`);
                }
            } else {
                warnings.push(`Doc ${index + 1}: CRD spec.contents is empty`);
                stagesRoot = {}; 
            }
        }
    }

    // Extract Selectors
    if (selectorsInput && typeof selectorsInput === 'object') {
        Object.entries(selectorsInput).forEach(([key, value]) => {
            selectors.push({
            id: Math.random().toString(36).substr(2, 9),
            key: key,
            operator: '==',
            value: String(value)
            });
        });
    }

    // Extract Actions from Stages
    if (stagesRoot) {
        Object.entries(stagesRoot).forEach(([stageKey, stageContent]) => {
            const phase = phaseMap[stageKey];
            
            if (!phase) {
                warnings.push(`Doc ${index + 1}: Unknown stage "${stageKey}".`);
                return;
            }

            const steps = Array.isArray(stageContent) ? stageContent : [stageContent];

            steps.forEach((step: any) => {
                if (typeof step !== 'object' || !step) return;

                // Extract Commands
                if (step.commands) {
                    const cmds = Array.isArray(step.commands) ? step.commands : [step.commands];
                    cmds.forEach((cmd: string) => {
                        if (cmd.startsWith('zypper install -y ')) {
                            const pkg = cmd.replace('zypper install -y ', '').trim();
                            actions.push({
                                id: Math.random().toString(36).substr(2, 9),
                                phase,
                                type: ActionType.PACKAGE,
                                packageName: pkg
                            } as any);
                        } else {
                            actions.push({
                                id: Math.random().toString(36).substr(2, 9),
                                phase,
                                type: ActionType.RUN_CMD,
                                command: cmd
                            } as any);
                        }
                    });
                }

                // Extract Files
                if (step.files) {
                    const files = Array.isArray(step.files) ? step.files : [step.files];
                    files.forEach((f: any) => {
                        let permissions = f.permissions;
                        if (permissions === undefined || permissions === null) {
                            permissions = '0600';
                        } else {
                            let permStr = String(permissions).trim();
                            
                            // If it's 3 digits (e.g. "600", "644", "755"), assume it's missing the leading zero
                            // because YAML 1.2 parses 0644 as decimal 644 which results in "644" string
                            if (/^[0-7]{3}$/.test(permStr)) {
                                permStr = '0' + permStr;
                            }
                            
                            // Validate 4 digit octal
                            if (/^[0-7]{4}$/.test(permStr)) {
                                permissions = permStr;
                            } else {
                                warnings.push(`Doc ${index + 1}: File "${f.path}" has invalid permissions "${permissions}". Expected 3 or 4-digit octal (e.g. 0600). Resetting to 0600.`);
                                permissions = '0600';
                            }
                        }

                        let owner = f.owner;
                        // Handle if owner is missing or explicitly 0
                        if (owner === undefined || owner === null) {
                            owner = '0';
                        } else {
                             // Validate numeric
                            if (!/^\d+$/.test(String(owner))) {
                                warnings.push(`Doc ${index + 1}: File "${f.path}" has invalid owner "${owner}". Expected numeric UID (e.g. 0). Resetting to 0.`);
                                owner = '0';
                            } else {
                                owner = String(owner);
                            }
                        }

                        actions.push({
                            id: Math.random().toString(36).substr(2, 9),
                            phase,
                            type: ActionType.WRITE_FILE,
                            path: f.path,
                            content: f.content,
                            permissions: permissions,
                            owner: owner,
                            encoding: f.encoding === 'b64' ? 'base64' : 'text'
                        } as any);
                    });
                }

                // Extract Users
                if (step.users) {
                    Object.entries(step.users).forEach(([username, userData]: [string, any]) => {
                        let sshKey = '';
                        if (userData.ssh_authorized_keys && Array.isArray(userData.ssh_authorized_keys) && userData.ssh_authorized_keys.length > 0) {
                            sshKey = userData.ssh_authorized_keys[0];
                        }
                        actions.push({
                            id: Math.random().toString(36).substr(2, 9),
                            phase,
                            type: ActionType.USER,
                            username: username,
                            groups: userData.groups || '',
                            sshKey: sshKey
                        } as any);
                    });
                }
                
                // Extract Systemd
                if (step.systemctl) {
                    Object.entries(step.systemctl).forEach(([state, services]) => {
                        const serviceList = Array.isArray(services) ? services : [services];
                        serviceList.forEach((srv: string) => {
                            actions.push({
                                id: Math.random().toString(36).substr(2, 9),
                                phase,
                                type: ActionType.SERVICE,
                                serviceName: srv,
                                state: state as any
                            } as any);
                        });
                    });
                }
            });
        });
    }

    return {
        config: {
            id: Math.random().toString(36).substr(2, 9),
            name: configName,
            selectors,
            actions
        },
        errors,
        warnings
    };
};

export const parseAndValidateYaml = (yamlStr: string): ValidationResult => {
  const globalErrors: string[] = [];
  const globalWarnings: string[] = [];
  const configs: CloudInitConfig[] = [];
  let parsedDocs: any[] = [];

  try {
    parsedDocs = jsyaml.loadAll(yamlStr);
  } catch (e: any) {
    return { isValid: false, errors: [`YAML Syntax Error: ${e.message}`], warnings: [], configs: [] };
  }

  if (parsedDocs.length === 0) {
    return { isValid: false, errors: ['No YAML documents found.'], warnings: [], configs: [] };
  }

  parsedDocs.forEach((doc, idx) => {
      if (!doc) return;
      // Removed unused third parameter 'parsedDocs.length'
      const result = parseConfigObject(doc, idx);
      
      // If a document is completely invalid (critical errors), we might skip it or fail whole import
      // Here we collect errors but attempt to proceed with valid ones? 
      // User requested validation, let's be strict if errors occur.
      if (result.errors.length > 0) {
          globalErrors.push(...result.errors);
      }
      if (result.warnings.length > 0) {
          globalWarnings.push(...result.warnings);
      }
      configs.push(result.config);
  });

  return {
    isValid: globalErrors.length === 0,
    errors: globalErrors,
    warnings: globalWarnings,
    configs: configs
  };
};