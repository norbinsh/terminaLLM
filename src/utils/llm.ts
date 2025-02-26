import Anthropic from '@anthropic-ai/sdk';
import { CommandResult } from '../types';

export const CLAUDE_MODEL = 'claude-3-7-sonnet-latest';
let client: Anthropic | null = null;

export const initializeClient = (key: string): void => {
  client = new Anthropic({
    apiKey: key,
    dangerouslyAllowBrowser: true
  });
};

interface CommandContext {
  currentDirectory: string;
  recentCommands: string[];
}

export const sendCommandToLLM = async (
  command: string, 
  context: CommandContext
): Promise<CommandResult> => {
  if (!client) {
    throw new Error('API client not initialized. Please provide an API key first.');
  }

  try {
    const systemPrompt = `
You are simulating a macOS terminal. The user will enter commands, and you will respond as if you are the terminal.

Current state:
- Current directory: ${context.currentDirectory}
- Recent commands: ${context.recentCommands.join(', ') || 'None'}

You should:
1. Process the command as if it were run in a real macOS terminal
2. Return the output that would be displayed
3. Track state changes (especially directory changes)
4. Maintain a virtual filesystem in your context

For commands like 'cd', 'mkdir', 'touch', etc., you should update your internal state accordingly.
For 'ls', you should list the contents of the current directory based on your internal state.

Your response must be formatted as follows:

---output---
(The terminal output goes here)
---directory---
(The new current directory if changed, otherwise omit this section)
`;

    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: command
        }
      ]
    });
    
    const contentBlock = response.content[0];
    const content = 'text' in contentBlock ? contentBlock.text : '';
    
    const outputMatch = content.match(/---output---([\s\S]*?)(?:---directory---|$)/);
    const directoryMatch = content.match(/---directory---([\s\S]*?)$/);
    
    const output = outputMatch ? outputMatch[1].trim() : 'No output';
    const newDirectory = directoryMatch ? directoryMatch[1].trim() : undefined;
    
    return {
      output,
      newDirectory,
      exitCode: 0,
      stateChanges: {}
    };
  } catch (error) {
    console.error('Error processing command with LLM:', error);
    return {
      output: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      exitCode: 1,
      stateChanges: {}
    };
  }
}
