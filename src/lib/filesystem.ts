import { FileSystemNode } from '../types';

export class FileSystem {
  private root: FileSystemNode;
  private currentDirectory: string[];
  private environment: { user: string };

  constructor(root: FileSystemNode, user: string = 'user') {
    this.root = root;
    this.currentDirectory = [];
    this.environment = { user };
  }

  public changeDirectory(path: string): string[] {
    const resolvedPath = this.resolvePath(path);
    const node = this.getNodeAtPath(resolvedPath);
    
    if (!node) {
      throw new Error(`cd: no such file or directory: ${path}`);
    }
    
    if (node.type !== 'directory') {
      throw new Error(`cd: not a directory: ${path}`);
    }
    
    this.currentDirectory = resolvedPath;
    return this.currentDirectory;
  }

  public resolvePath(path: string): string[] {
    if (path === '') return [...this.currentDirectory];
    
    const parts = path.split('/').filter(Boolean);
    const isAbsolute = path.startsWith('/');
    
    const result = isAbsolute ? [] : [...this.currentDirectory];
    
    for (const part of parts) {
      if (part === '.') continue;
      if (part === '..') {
        if (result.length > 0) result.pop();
        continue;
      }
      result.push(part);
    }
    
    return result;
  }

  public makeDirectory(path: string): void {
    const parts = path.split('/').filter(Boolean);
    
    const currentPath = path.startsWith('/') ? [] : [...this.currentDirectory];
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      if (part === '.' || part === '..') {
        throw new Error(`mkdir: invalid directory name: ${part}`);
      }
      
      currentPath.push(part);
      
      const node = this.getNodeAtPath(currentPath);
      
      if (node && i < parts.length - 1) {
        if (node.type !== 'directory') {
          throw new Error(`mkdir: ${currentPath.join('/')} is not a directory`);
        }
      } else if (!node) {
        this.createNode(
          [...currentPath.slice(0, -1)],
          'directory',
          { [currentPath[currentPath.length - 1]]: { type: 'directory', children: {} } }
        );
      }
    }
  }

  public getNodeAtPath(path: string | string[]): FileSystemNode | null {
    const pathArray = typeof path === 'string' ? this.resolvePath(path) : path;
    
    let current: FileSystemNode = this.root;
    
    for (const part of pathArray) {
      if (!current.children || !current.children[part]) {
        return null;
      }
      
      current = current.children[part];
    }
    
    return current;
  }

  private createNode(path: string[], type: string, content: unknown): void {
    console.log(`Creating ${type} at ${path.join('/')} with content:`, content);
  }
} 