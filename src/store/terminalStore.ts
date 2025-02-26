import { create } from 'zustand';
import { HistoryEntry, CommandResult } from '../types';
import { sendCommandToLLM } from '../utils/llm';

interface TerminalStore {
  // Core state
  currentDirectory: string;
  history: HistoryEntry[];
  
  // UI state
  isOpen: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  apiKey: string | null;
  isProcessing: boolean;
  
  // Actions
  setTerminalWindow: (window: Partial<{
    isOpen: boolean;
    position: { x: number; y: number };
    size: { width: number; height: number };
  }>) => void;
  
  setApiKey: (key: string | null) => void;
  setProcessing: (isProcessing: boolean) => void;
  
  // Command handling
  executeCommand: (command: string) => Promise<CommandResult>;
  addToHistory: (entry: Omit<HistoryEntry, 'id'>) => void;
  
  // Reset terminal
  resetTerminal: () => void;
}

export const useTerminalStore = create<TerminalStore>((set, get) => ({
  // Core state
  currentDirectory: '/home/user',
  history: [],
  
  // UI state
  isOpen: false,
  position: { x: 100, y: 100 },
  size: { width: 800, height: 500 },
  apiKey: null,
  isProcessing: false,
  
  // UI actions
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
  
  // Command execution - simplified to let the LLM handle everything
  executeCommand: async (command: string): Promise<CommandResult> => {
    try {
      set({ isProcessing: true });
      
      // Get current state for context
      const { currentDirectory, history } = get();
      
      // Send to LLM with minimal context
      const result = await sendCommandToLLM(command, {
        currentDirectory,
        recentCommands: history.slice(-5).map(h => h.command)
      });
      
      // Add to history
      get().addToHistory({
        command,
        output: result.output,
        directory: currentDirectory,
        timestamp: new Date().toISOString()
      });
      
      // Update directory if changed
      if (result.newDirectory) {
        set({ currentDirectory: result.newDirectory });
      }
      
      return result;
    } catch (error) {
      console.error('Command execution error:', error);
      
      // Add error to history
      get().addToHistory({
        command,
        output: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        directory: get().currentDirectory,
        timestamp: new Date().toISOString()
      });
      
      // Return a valid CommandResult with all required fields
      return {
        output: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        exitCode: 1,
        stateChanges: {}
      };
    } finally {
      set({ isProcessing: false });
    }
  },
  
  // Add entry to history
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
  
  // Reset terminal state
  resetTerminal: () =>
    set({
      currentDirectory: '/home/user',
      history: []
    })
})); 