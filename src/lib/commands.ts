export interface CommandResult {
  output: string;
  success: boolean;
  stateChanges?: {
    currentDirectory?: string;
  };
}

export const cd = async (args: string[], fs: FileSystem): Promise<CommandResult> => {
  const path = args[0] || '~';
  try {
    const newPathArray = fs.changeDirectory(path);
    const newPathString = '/' + newPathArray.join('/');
    
    return {
      output: '',
      success: true,
      stateChanges: {
        currentDirectory: newPathString
      }
    };
  } catch (error) {
    return {
      output: `cd: ${error.message}`,
      success: false
    };
  }
};

export const mkdir = async (args: string[], fs: FileSystem): Promise<CommandResult> => {
  if (args.length === 0) {
    return {
      output: 'mkdir: missing operand',
      success: false
    };
  }

  try {
    for (const dir of args) {
      fs.makeDirectory(dir);
    }
    return {
      output: '',
      success: true
    };
  } catch (error) {
    return {
      output: `mkdir: ${error.message}`,
      success: false
    };
  }
}; 