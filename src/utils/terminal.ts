import Anthropic from '@anthropic-ai/sdk';
import { FileSystemNode } from '../types';
import { CLAUDE_MODEL } from './llm';

let client: Anthropic | null = null;

const createClient = (apiKey: string) => new Anthropic({
  apiKey,
  dangerouslyAllowBrowser: true
});

const SYSTEM_PROMPT = `You are simulating a macOS terminal with EXACT output matching and persistent state. You MUST:

1. Return ONLY the exact terminal output as it would appear - no explanations or commentary
2. For successful commands that don't produce output (like mkdir, cd, touch), return an empty string
3. Match error messages exactly as they appear in macOS terminal:
   - "cd: no such file or directory: x"
   - "mkdir: x: File exists"
   - "rm: x: No such file or directory"
   - "ls: x: No such file or directory"
   - "cat: x: No such file or directory"

4. Handle path navigation exactly like macOS:
   - cd .. : Move up one directory
   - cd ../.. : Move up two directories
   - cd ~ : Go to home directory
   - cd - : Go to previous directory
   - cd ./dir : Navigate to dir in current directory
   - cd /absolute/path : Navigate to absolute path
   - Resolve . and .. in paths correctly
   - Handle relative paths from current directory

5. File System Operations:
   When creating/modifying files or directories, you MUST:
   - Check if the file/directory already exists before creating
   - Maintain consistent state with previous commands
   - Include ALL necessary actions in the response
   - Return appropriate error messages if operation fails
   
   For mkdir:
   ---output---
   
   ---output---
   ---actions---
   {
     "createFiles": [{ "path": "dirname", "content": "", "type": "directory" }]
   }
   ---actions---

   For cd:
   ---output---
   
   ---output---
   ---actions---
   {
     "newPath": "full/path/to/directory"
   }
   ---actions---

   For ls:
   ---output---
   Applications    Documents    test-dir    package.json
   ---output---
   ---actions---
   {}
   ---actions---

6. State Management Rules:
   - Track and maintain ALL file system changes between commands
   - Consider the complete command history when processing new commands
   - Ensure file system state is consistent with previous operations
   - Validate operations against current state before executing
   - Return appropriate error messages for invalid operations

Here are examples of real terminal interactions with state persistence:

❯ pwd
/Users/user/Projects

❯ mkdir test-dir

❯ ls
Applications    Documents    test-dir    package.json

❯ cd test-dir

❯ pwd
/Users/user/Projects/test-dir

❯ cd ..

❯ mkdir test-dir
mkdir: test-dir: File exists

❯ mkdir -p deep/nested/dir

❯ cd deep/nested/dir

❯ pwd
/Users/user/Projects/deep/nested/dir

❯ cd ../..

❯ touch file.txt

❯ ls -la
total 0
drwxr-xr-x   3 user  staff   96 Mar 15 14:30 .
drwxr-xr-x   7 user  staff  224 Mar 15 14:30 ..
-rw-r--r--   1 user  staff    0 Mar 15 14:30 file.txt

Remember:
1. NEVER explain what you're doing, just output exactly like a real terminal
2. ALWAYS include appropriate actions for file system operations
3. Maintain proper state between commands
4. Show git branch and status when in a git repo
5. Show Python/Node version when relevant
6. Format output exactly like the examples above
7. Return empty string (not "(no output)") for successful commands that produce no output
8. ALWAYS check current state before executing commands
9. ALWAYS validate operations against existing file system state`;

interface SessionContext {
  currentPath: string[];
  fileSystem: {
    getNode: (path: string[]) => FileSystemNode | null;
    createFile: (path: string[], content?: string) => void;
    createDirectory: (path: string[]) => void;
    deleteNode: (path: string[]) => void;
    updateFileContent: (path: string[], content: string) => void;
    changeDirectory: (path: string[]) => void;
  };
  gitInfo?: {
    branch?: string;
    status?: string[];
  };
  envInfo?: {
    python?: string;
    node?: string;
  };
}

interface TerminalHistory {
  command: string;
  output: string;
  state: {
    currentPath: string[];
    files: { [key: string]: FileSystemNode };
  };
}

export interface TerminalStore {
  history: TerminalHistory[];
  addHistory: (entry: TerminalHistory) => void;
  clearHistory: () => void;
}

const terminalStore: TerminalStore = {
  history: [],
  addHistory: (entry: TerminalHistory) => {
    terminalStore.history.push(entry);
    if (terminalStore.history.length > 10) {
      terminalStore.history.shift();
    }
  },
  clearHistory: () => {
    terminalStore.history = [];
  }
};

export const validateApiKey = async (apiKey: string): Promise<boolean> => {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    console.error('API key validation failed: Empty or invalid key format');
    return false;
  }

  try {
    const testClient = createClient(apiKey.trim());

    const response = await testClient.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 10,
      messages: [{ 
        role: 'user', 
        content: 'test' 
      }]
    });

    if (!response || !response.content || !response.content[0]) {
      console.error('API key validation failed: Invalid response format');
      return false;
    }

    return response.content[0].text.length > 0;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('API key validation failed:', {
        name: error.name,
        message: error.message,
      });
    } else {
      console.error('API key validation failed - unknown error type');
    }
    return false;
  }
};

export const initializeClient = (apiKey: string) => {
  if (!apiKey) {
    throw new Error('API key is required');
  }
  
  client = createClient(apiKey.trim());
};

export const processCommand = async (
  command: string,
  context: SessionContext
): Promise<string> => {
  if (!client) {
    return 'Error: Terminal not initialized. Please provide a valid Claude API key.';
  }

  if (command === '[API Key Input]') {
    return 'API key accepted.';
  }

  try {
    const currentState = {
      currentPath: context.currentPath,
      files: context.fileSystem.getNode([])?.content || {}
    };

    const historyContext = terminalStore.history
      .map(h => `Command: ${h.command}
Output: ${h.output}
Directory: ${h.state.currentPath.join('/')}
Files: ${JSON.stringify(h.state.files, null, 2)}
---`)
      .join('\n');

    console.log('Sending state to model:', {
      currentPath: context.currentPath,
      currentDirFiles: Object.keys(context.fileSystem.getNode(context.currentPath)?.content || {}),
      completeState: currentState.files,
      historyLength: terminalStore.history.length
    });

    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1000,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Previous commands and state:
${historyContext}

Current state:
- Directory: ${context.currentPath.join('/')}
- Files in current directory: ${JSON.stringify(Object.keys(context.fileSystem.getNode(context.currentPath)?.content || {}), null, 2)}
- Complete file system: ${JSON.stringify(currentState.files, null, 2)}
- Git info: ${JSON.stringify(context.gitInfo)}
- Env info: ${JSON.stringify(context.envInfo)}

Command: ${command}

Remember:
1. Return EMPTY string (not "no output") for successful commands that don't produce output
2. Include all necessary file system actions in the response
3. Maintain consistent state between commands
4. Consider all previous commands and their effects
5. The complete file system state is provided - use it to validate operations

Format the response EXACTLY as:
---output---
exact terminal output here
---output---
---actions---
{
  "newPath": "path/to/set/for/cd",  // only for cd commands
  "createFiles": [                   // files to create
    { "path": "file/path", "content": "file content", "type": "file|directory" }
  ],
  "deleteFiles": ["file/path"]      // files to delete
}
---actions---`
        }
      ]
    });

    if (!response || !response.content || !response.content[0]) {
      console.error('Invalid response from Anthropic API');
      return 'Error: Invalid response from the model';
    }

    const output = response.content[0].text;
    
    const parts = output.split('---');
    if (parts.length < 5) {
      console.error('Invalid response format - missing sections:', parts);
      return 'Error: Invalid command output format';
    }
    
    const terminalOutput = parts[2]?.trim() || '';
    const actionsJson = parts[4]?.trim();
    
    if (actionsJson) {
      try {
        if (!actionsJson || actionsJson === '') {
          terminalStore.addHistory({
            command,
            output: terminalOutput,
            state: {
              currentPath: [...context.currentPath],
              files: context.fileSystem.getNode([])?.type === 'directory' 
                ? (context.fileSystem.getNode([])?.content as { [key: string]: FileSystemNode })
                : {}
            }
          });
          return terminalOutput;
        }
        
        let actions;
        try {
          actions = JSON.parse(actionsJson);
        } catch (jsonError) {
          console.error('Failed to parse actions JSON:', jsonError);
          console.error('Raw actions JSON:', actionsJson);
          
          terminalStore.addHistory({
            command,
            output: terminalOutput,
            state: {
              currentPath: [...context.currentPath],
              files: context.fileSystem.getNode([])?.type === 'directory' 
                ? (context.fileSystem.getNode([])?.content as { [key: string]: FileSystemNode })
                : {}
            }
          });
          
          return terminalOutput;
        }
        
        console.log('Processing actions:', actions);
        
        if (actions.newPath && typeof actions.newPath !== 'string') {
          throw new Error('Invalid newPath format');
        }
        if (actions.createFiles && !Array.isArray(actions.createFiles)) {
          throw new Error('Invalid createFiles format');
        }
        if (actions.deleteFiles && !Array.isArray(actions.deleteFiles)) {
          throw new Error('Invalid deleteFiles format');
        }
        
        if (actions.newPath) {
          console.log('Changing directory to:', actions.newPath);
          const newPath = actions.newPath.split('/').filter(Boolean);
          context.fileSystem.changeDirectory(newPath);
        }
        
        if (actions.createFiles) {
          for (const file of actions.createFiles) {
            if (!file.path || !file.type || (file.type !== 'file' && file.type !== 'directory')) {
              throw new Error(`Invalid file creation request: ${JSON.stringify(file)}`);
            }
            console.log('Creating file:', file.path);
            const filePath = file.path.split('/').filter(Boolean);
            if (file.type === 'directory') {
              context.fileSystem.createDirectory(filePath);
            } else {
              context.fileSystem.createFile(filePath, file.content || '');
            }
          }
        }
        
        if (actions.deleteFiles) {
          for (const file of actions.deleteFiles) {
            if (typeof file !== 'string') {
              throw new Error(`Invalid file deletion request: ${file}`);
            }
            console.log('Deleting file:', file);
            const filePath = file.split('/').filter(Boolean);
            context.fileSystem.deleteNode(filePath);
          }
        }

        const updatedState = {
          currentPath: [...context.currentPath],
          files: context.fileSystem.getNode([])?.type === 'directory' 
            ? (context.fileSystem.getNode([])?.content as { [key: string]: FileSystemNode })
            : {}
        };
        
        console.log('State after changes:', {
          currentPath: updatedState.currentPath,
          files: Object.keys(updatedState.files)
        });

        terminalStore.addHistory({
          command,
          output: terminalOutput,
          state: updatedState
        });
      } catch (e) {
        console.error('Error processing actions:', e);
        console.error('Actions JSON was:', actionsJson);
        return 'Error: Invalid command action format';
      }
    }
    
    return terminalOutput;
  } catch (error) {
    console.error('Command processing error:', error);
    
    const errorMessage = error instanceof Error ? `Error: ${error.message}` : 'An unknown error occurred';
    
    terminalStore.addHistory({
      command,
      output: errorMessage,
      state: {
        currentPath: [...context.currentPath],
        files: context.fileSystem.getNode([])?.type === 'directory' 
          ? (context.fileSystem.getNode([])?.content as { [key: string]: FileSystemNode })
          : {}
      }
    });
    
    return errorMessage;
  }
};