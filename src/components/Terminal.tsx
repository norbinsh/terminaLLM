import React, { useState, useRef, useEffect } from 'react';
import Draggable from 'react-draggable';
import { useTerminalStore } from '../store/terminalStore';
import { initializeClient } from '../utils/llm';

// Helper function to clean terminal output from section markers
const cleanTerminalOutput = (output: string): string => {
  return output
    // Remove section markers
    .replace(/---(?:output|directory)---/g, '')
    // Replace consecutive newlines
    .replace(/\n{3,}/g, '\n\n')
    // Trim whitespace
    .trim();
};

const formatPrompt = (currentDirectory: string, user: string = 'user', hostname: string = 'mac') => {
  return `${user}@${hostname}:${currentDirectory}$`;
};

export const Terminal: React.FC = () => {
  const [input, setInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  const {
    // Core state
    currentDirectory,
    history,
    
    // UI state
    isOpen,
    position,
    size,
    apiKey,
    isProcessing,
    
    // Actions
    setTerminalWindow,
    setApiKey,
    setProcessing,
    executeCommand,
    addToHistory
  } = useTerminalStore();

  // Open terminal on mount
  useEffect(() => {
    setTerminalWindow({ isOpen: true });
  }, [setTerminalWindow]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleApiKeySubmission = async (key: string) => {
    setProcessing(true);
    // Clear input immediately to prevent key from being displayed
    setInput('');
    
    if (!key || key.trim().length < 10) {
      console.error('Invalid API key format - key is too short');
      setApiKey(null);
      addToHistory({
        command: '[API Key Input]',
        output: 'Error: Invalid API key format. Please enter a valid Anthropic API key.',
        directory: currentDirectory,
        timestamp: new Date().toISOString()
      });
      setProcessing(false);
      return;
    }
    
    try {
      console.log('Attempting to initialize client with provided API key');
      initializeClient(key);
      setApiKey(key);
      
      // Add masked API key entry to history
      addToHistory({
        command: '[API Key Input]',
        output: 'API key accepted.',
        directory: currentDirectory,
        timestamp: new Date().toISOString()
      });
      
      // Add welcome message
      await executeCommand('echo "Terminal ready. API connection established."');
    } catch (error) {
      // Don't log the API key in error messages
      console.error('API key validation failed:', error);
      setApiKey(null);
      addToHistory({
        command: '[API Key Input]',
        output: 'Error: API key validation failed. Please check your Anthropic API key and try again.',
        directory: currentDirectory,
        timestamp: new Date().toISOString()
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCommand = async () => {
    if (!input.trim()) return;

    const currentInput = input;
    
    // Clear input before processing command to prevent sensitive data from lingering
    setInput('');

    if (!apiKey) {
      await handleApiKeySubmission(currentInput);
      return;
    }

    try {
      console.log('Executing command:', currentInput);
      await executeCommand(currentInput);
    } catch (error) {
      console.error('Command execution failed:', error);
    }

    setHistoryIndex(-1);
    
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  };

  const handleKeyPress = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await handleCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex].command);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex].command);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Tab completion would be handled by the LLM
    }
  };

  if (!isOpen) return null;

  return (
    <Draggable
      handle=".handle"
      nodeRef={dragRef}
      defaultPosition={position}
    >
      <div 
        ref={dragRef}
        className="fixed top-20 left-20 w-[700px] bg-[rgba(28,28,28,0.95)] backdrop-blur-md rounded-lg shadow-2xl overflow-hidden border border-gray-800"
        style={{ width: size.width, height: size.height }}
      >
        <div className="handle h-8 bg-[rgba(40,40,40,0.95)] flex items-center justify-between px-4 cursor-move select-none">
          <div className="flex space-x-2">
            <button
              onClick={() => setTerminalWindow({ isOpen: false })}
              className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
            />
            <button 
              onClick={() => setTerminalWindow({ size: { width: 700, height: 400 } })}
              className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors" 
            />
            <button className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors" />
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 text-white/60 text-sm">
            Terminal
          </div>
          <div className="w-20" />
        </div>
        
        <div 
          className="p-4 overflow-y-auto font-mono text-sm leading-relaxed"
          ref={terminalRef}
          style={{ height: size.height - 32 }}
          onClick={() => inputRef.current?.focus()}
        >
          {!apiKey && (
            <>
              <div className="text-green-400 mb-2">
                Welcome to Terminal. Please provide your Claude API key to continue:
              </div>
              <div className="text-yellow-400 mb-4 text-xs">
                🔒 Security Note: This is a completely client-side application.
                <ul className="list-disc ml-4 mt-1">
                  <li>Your API key is used <span className="text-white">only</span> to communicate directly with Claude's API from your browser</li>
                  <li>No middleman or server involved - direct browser-to-Claude communication</li>
                  <li>The key is never stored anywhere</li>
                  <li>The key is cleared when you close the tab</li>
                </ul>
                <p className="mt-2 text-white/80">Your API key stays in your browser and is only used to talk directly to Claude.</p>
              </div>
            </>
          )}

          {history.map((entry) => (
            <div key={entry.id} className="mb-2">
              <div className="flex items-center text-green-400">
                <span className="text-blue-400">
                  {formatPrompt(entry.directory)}
                </span>
                <span className="ml-2">
                  {entry.command === '[API Key Input]' ? '********' : entry.command}
                </span>
              </div>
              <div className="text-white whitespace-pre-wrap">
                {entry.command === '[API Key Input]' && entry.output.startsWith('API key') 
                  ? 'API key accepted.' 
                  : cleanTerminalOutput(entry.output)}
              </div>
            </div>
          ))}

          <div className="flex items-center">
            <span className="text-blue-400">
              {formatPrompt(currentDirectory)}
            </span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              className="flex-1 bg-transparent text-white outline-none ml-2 font-mono"
              autoFocus
              type={!apiKey ? "password" : "text"}
              placeholder={!apiKey ? "Enter your Claude API key..." : ""}
              disabled={isProcessing}
            />
            {isProcessing && (
              <span className="text-gray-400 ml-2">Processing...</span>
            )}
          </div>
        </div>
      </div>
    </Draggable>
  );
};