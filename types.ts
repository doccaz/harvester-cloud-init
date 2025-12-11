export enum Phase {
  GLOBAL = 'Global (Standard)',
  PRE_INSTALL = 'Installer: Pre-Install',
  POST_INSTALL = 'Installer: Post-Install (Chroot)',
  BOOT = 'OS: Boot',
  NETWORK = 'OS: Network',
}

export enum ActionType {
  WRITE_FILE = 'write_file',
  RUN_CMD = 'run_cmd',
  PACKAGE = 'package',
  USER = 'user',
  SERVICE = 'service',
}

export interface NodeSelector {
  id: string;
  key: string;
  operator: '==' | '!=' | 'Exists' | 'DoesNotExist';
  value: string;
}

export interface BaseAction {
  id: string;
  phase: Phase;
  type: ActionType;
}

export interface WriteFileAction extends BaseAction {
  type: ActionType.WRITE_FILE;
  path: string;
  content: string;
  permissions: string;
  encoding: 'text' | 'base64';
  owner: string;
}

export interface RunCmdAction extends BaseAction {
  type: ActionType.RUN_CMD;
  command: string;
}

export interface PackageAction extends BaseAction {
  type: ActionType.PACKAGE;
  packageName: string;
  version?: string;
}

export interface UserAction extends BaseAction {
  type: ActionType.USER;
  username: string;
  groups: string;
  sshKey: string;
}

export interface ServiceAction extends BaseAction {
  type: ActionType.SERVICE;
  serviceName: string;
  state: 'start' | 'stop' | 'restart' | 'enable' | 'disable';
}

export type CloudAction = 
  | WriteFileAction 
  | RunCmdAction 
  | PackageAction 
  | UserAction 
  | ServiceAction;

export interface CloudInitConfig {
  id: string;
  name: string;
  selectors: NodeSelector[];
  actions: CloudAction[];
}

export interface AppState {
  configs: CloudInitConfig[];
  activeConfigId: string;
}