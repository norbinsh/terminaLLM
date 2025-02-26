import { 
  SystemState, 
  FileSystemNode, 
  FileSystemState,
  EnvironmentState,
  ProcessState,
  CommandHistory,
  FileMetadata,
  FilePermissions
} from '../types';

const DEFAULT_FILE_PERMISSIONS: FilePermissions = {
  user: { read: true, write: true, execute: false },
  group: { read: true, write: false, execute: false },
  others: { read: true, write: false, execute: false },
  special: { setuid: false, setgid: false, sticky: false }
};

const DEFAULT_DIR_PERMISSIONS: FilePermissions = {
  user: { read: true, write: true, execute: true },
  group: { read: true, write: false, execute: true },
  others: { read: true, write: false, execute: true },
  special: { setuid: false, setgid: false, sticky: false }
};

export function createFSNode(
  name: string,
  type: 'file' | 'directory' | 'symlink',
  content: string | Record<string, FileSystemNode> = '',
  permissions = type === 'directory' ? DEFAULT_DIR_PERMISSIONS : DEFAULT_FILE_PERMISSIONS
): FileSystemNode {
  const now = Date.now();
  const metadata: FileMetadata = {
    created: now,
    modified: now,
    accessed: now,
    size: type === 'directory' ? 4096 : content.length,
    owner: 'user',
    group: 'staff'
  };

  return {
    type,
    name,
    content,
    metadata,
    permissions
  };
}

function initializeFileSystem(): FileSystemState {
  const root = createFSNode('/', 'directory', {
    'bin': createFSNode('bin', 'directory', {}),
    'etc': createFSNode('etc', 'directory', {}),
    'home': createFSNode('home', 'directory', {
      'user': createFSNode('user', 'directory', {
        'Documents': createFSNode('Documents', 'directory', {}),
        'Downloads': createFSNode('Downloads', 'directory', {}),
        'Desktop': createFSNode('Desktop', 'directory', {}),
        '.bash_history': createFSNode('.bash_history', 'file', ''),
        '.bashrc': createFSNode('.bashrc', 'file', '# .bashrc\n'),
      })
    }),
    'usr': createFSNode('usr', 'directory', {
      'bin': createFSNode('bin', 'directory', {}),
      'local': createFSNode('local', 'directory', {})
    }),
    'var': createFSNode('var', 'directory', {
      'log': createFSNode('log', 'directory', {})
    }),
    'tmp': createFSNode('tmp', 'directory', {})
  });

  return {
    root,
    currentPath: ['home', 'user'],
    tempFiles: new Map()
  };
}

function initializeEnvironment(): EnvironmentState {
  return {
    variables: {
      'PATH': '/usr/local/bin:/usr/bin:/bin',
      'HOME': '/home/user',
      'USER': 'user',
      'SHELL': '/bin/zsh',
      'TERM': 'xterm-256color',
      'PWD': '/home/user',
      'LANG': 'en_US.UTF-8',
    },
    user: 'user',
    hostname: 'mbp-1',
    shell: '/bin/zsh',
    cwd: ['home', 'user'],
    previousCwd: null
  };
}

function initializeProcesses(): ProcessState {
  const initProcess = {
    pid: 1,
    command: 'init',
    status: 'running' as const,
    startTime: Date.now(),
    user: 'root'
  };

  return {
    running: [initProcess],
    lastPid: 1,
    backgroundJobs: []
  };
}

function initializeHistory(): CommandHistory {
  return {
    entries: [],
    lastId: 0
  };
}

export function initializeSystem(): SystemState {
  return {
    fileSystem: initializeFileSystem(),
    environment: initializeEnvironment(),
    processes: initializeProcesses(),
    history: initializeHistory()
  };
}

export function resolvePath(currentPath: string[], targetPath: string): string[] {
  if (targetPath.startsWith('/')) {
    return targetPath.split('/').filter(Boolean);
  }

  if (targetPath === '.' || targetPath === '') {
    return [...currentPath];
  }
  if (targetPath === '..') {
    return currentPath.slice(0, -1);
  }
  if (targetPath === '~') {
    return ['home', 'user'];
  }
  if (targetPath.startsWith('~/')) {
    return ['home', 'user', ...targetPath.slice(2).split('/').filter(Boolean)];
  }

  const parts = targetPath.split('/').filter(Boolean);
  const newPath = [...currentPath];

  for (const part of parts) {
    if (part === '..') {
      newPath.pop();
    } else if (part !== '.') {
      newPath.push(part);
    }
  }

  return newPath;
}

export function getNodeAtPath(root: FileSystemNode, path: string[]): FileSystemNode | null {
  let current = root;

  for (const segment of path) {
    if (current.type !== 'directory' || typeof current.content === 'string') {
      return null;
    }
    if (!(segment in current.content)) {
      return null;
    }
    current = current.content[segment];
  }

  return current;
}

export function formatPermissions(permissions: FilePermissions): string {
  const { user, group, others } = permissions;
  
  const userStr = `${user.read ? 'r' : '-'}${user.write ? 'w' : '-'}${user.execute ? 'x' : '-'}`;
  const groupStr = `${group.read ? 'r' : '-'}${group.write ? 'w' : '-'}${group.execute ? 'x' : '-'}`;
  const othersStr = `${others.read ? 'r' : '-'}${others.write ? 'w' : '-'}${others.execute ? 'x' : '-'}`;
  
  return `${userStr}${groupStr}${othersStr}`;
}

export function formatSize(size: number): string {
  if (size < 1024) return size.toString();
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}K`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)}M`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)}G`;
}

export function checkPermission(
  node: FileSystemNode,
  user: string,
  operation: 'read' | 'write' | 'execute'
): boolean {
  const { permissions } = node;
  
  if (user === 'root') return true;
  if (node.metadata.owner === user) return permissions.user[operation];
  if (node.metadata.group === 'staff') return permissions.group[operation];
  return permissions.others[operation];
} 