import { create } from 'zustand';
import { HistoryEntry, CommandResult } from '../types';
import { sendCommandToLLM } from '../utils/llm';

interface TerminalStore {
  currentDirectory: string;
  history: HistoryEntry[];
  
  isOpen: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  apiKey: string | null;
  isProcessing: boolean;
  
  setTerminalWindow: (window: Partial<{
    isOpen: boolean;
    position: { x: number; y: number };
    size: { width: number; height: number };
  }>) => void;
  
  setApiKey: (key: string | null) => void;
  setProcessing: (isProcessing: boolean) => void;
  
  executeCommand: (command: string) => Promise<CommandResult>;
  addToHistory: (entry: Omit<HistoryEntry, 'id'>) => void;
  
  resetTerminal: () => void;
}

export const useTerminalStore = create<TerminalStore>((set, get) => ({
  currentDirectory: '/home/user',
  history: [],
  
  isOpen: false,
  position: { x: 100, y: 100 },
  size: { width: 800, height: 500 },
  apiKey: null,
  isProcessing: false,
  
  setTerminalWindow: (window) =>
    set((state) => ({
      ...state,
      ...window,
    })),
    
  setApiKey: (key) =>
    set((state) => ({
      ...state,
      apiKey: key,
    })),
    
  setProcessing: (isProcessing) =>
    set((state) => ({
      ...state,
      isProcessing,
    })),
  
  executeCommand: async (command: string): Promise<CommandResult> => {
    try {
      set({ isProcessing: true });
      
      const { currentDirectory, history } = get();
      
      const result = await sendCommandToLLM(command, {
        currentDirectory,
        recentCommands: history.slice(-5).map(h => h.command)
      });
      
      get().addToHistory({
        command,
        output: result.output,
        directory: currentDirectory,
        timestamp: new Date().toISOString()
      });
      
      if (result.newDirectory) {
        set({ currentDirectory: result.newDirectory });
      }
      
      return result;
    } catch (error) {
      console.error('Command execution error:', error);
      
      get().addToHistory({
        command,
        output: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        directory: get().currentDirectory,
        timestamp: new Date().toISOString()
      });
      
      return {
        output: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        exitCode: 1,
        stateChanges: {}
      };
    } finally {
      set({ isProcessing: false });
    }
  },
  
  addToHistory: (entry) =>
    set((state) => ({
      history: [
        ...state.history,
        {
          id: state.history.length + 1,
          ...entry
        }
      ]
    })),
  
  resetTerminal: () =>
    set({
      currentDirectory: '/home/user',
      history: []
    })
})); 