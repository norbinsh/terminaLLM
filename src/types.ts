// Core system types for macOS terminal simulation
export interface SystemState {
  fileSystem: FileSystemState;
  environment: EnvironmentState;
  processes: ProcessState;
  history: CommandHistory;
}

export interface EnvironmentState {
  variables: Record<string, string>;
  user: string;
  hostname: string;
  shell: string;
  cwd: string[];
  previousCwd: string[] | null;
}

export interface ProcessState {
  running: Process[];
  lastPid: number;
  backgroundJobs: BackgroundJob[];
}

export interface Process {
  pid: number;
  command: string;
  status: 'running' | 'stopped' | 'zombie';
  startTime: number;
  user: string;
}

export interface BackgroundJob {
  id: number;
  process: Process;
  suspended: boolean;
}

export interface CommandHistory {
  entries: HistoryEntry[];
  lastId: number;
}

export interface HistoryEntry {
  id: number;
  command: string;
  output: string;
  directory: string;
  timestamp: string;
}

// Enhanced file system types
export interface FileSystemState {
  root: FileSystemNode;
  currentPath: string[];
  tempFiles: Map<string, FileSystemNode>;
}

export interface FileSystemNode {
  type: 'file' | 'directory' | 'symlink';
  name: string;
  content: string | Record<string, FileSystemNode>;
  metadata: FileMetadata;
  permissions: FilePermissions;
  children?: Record<string, FileSystemNode>;
}

export interface FileMetadata {
  created: number;
  modified: number;
  accessed: number;
  size: number;
  owner: string;
  group: string;
}

export interface FilePermissions {
  user: Permission;
  group: Permission;
  others: Permission;
  special: SpecialPermissions;
}

export interface Permission {
  read: boolean;
  write: boolean;
  execute: boolean;
}

export interface SpecialPermissions {
  setuid: boolean;
  setgid: boolean;
  sticky: boolean;
}

// Command processing types
export interface StateChanges {
  fileSystem?: FileSystemChanges[];
  environment?: EnvironmentChanges[];
  processes?: ProcessChanges[];
}

export interface CommandResult {
  output: string;
  newDirectory?: string;
  exitCode: number;
  stateChanges: StateChanges;
}

export interface FileSystemChanges {
  type: 'create' | 'modify' | 'delete' | 'chmod' | 'chown';
  path: string[];
  data?: unknown;
}

export interface EnvironmentChanges {
  type: 'set' | 'unset' | 'append' | 'cd';
  name: string;
  value?: string;
}

export interface ProcessChanges {
  type: 'start' | 'stop' | 'kill' | 'background' | 'foreground';
  process: {
    pid: number;
    command: string;
    status: string;
    startTime: number;
    user: string;
  };
}

// Terminal window state (UI related)
export interface TerminalState {
  currentDirectory: string;
  history: HistoryEntry[];
}

export interface WindowState {
  isOpen: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

// This is just a minimal representation for the LLM to understand
// The actual filesystem state will be maintained in the LLM's context
export interface VirtualFilesystem {
  // Just a placeholder to indicate this is handled by the LLM
  _managed_by_llm: boolean;
}

// For backward compatibility if needed
export interface LegacySystemState {
  fileSystem: {
    currentPath: string[];
    root: Record<string, unknown>;
  };
  environment: {
    user: string;
    variables: {
      HOME: string;
      PATH: string;
    };
    shell: string;
  };
  processes: {
    running: unknown[];
    backgroundJobs: unknown[];
  };
  history: {
    entries: { command: string }[];
  };
}