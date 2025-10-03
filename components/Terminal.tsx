import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { FileItem, FolderItem, FileSystemItem } from '../types';

interface TerminalProps {
  fileSystem: FolderItem;
}

interface OutputLine {
  type: 'command' | 'response';
  content: string;
}

// --- Recursive Helpers for Terminal ---

const findFileByName = (item: FileSystemItem, name: string): FileItem | null => {
  if (item.type === 'file' && item.name === name) {
    return item;
  }
  if (item.type === 'folder') {
    for (const child of item.children) {
      const found = findFileByName(child, name);
      if (found) return found;
    }
  }
  return null;
};

const generateTreeString = (item: FileSystemItem, prefix = ''): string => {
  let result = `${prefix}${item.type === 'folder' ? '📁' : '📄'} ${item.name}\n`;
  if (item.type === 'folder') {
    item.children.forEach((child, index) => {
      const isLast = index === item.children.length - 1;
      const newPrefix = `${prefix}${isLast ? '└── ' : '├── '}`;
      result += generateTreeString(child, newPrefix);
    });
  }
  return result;
};


const Terminal: React.FC<TerminalProps> = ({ fileSystem }) => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<OutputLine[]>(() => {
    try {
      const savedOutput = localStorage.getItem('terminalOutput');
      return savedOutput ? JSON.parse(savedOutput) : [];
    } catch (error) {
      console.error("Failed to parse terminal output from localStorage", error);
      return [];
    }
  });
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const savedHistory = localStorage.getItem('terminalHistory');
      return savedHistory ? JSON.parse(savedHistory) : [];
    } catch (error) {
      console.error("Failed to parse terminal history from localStorage", error);
      return [];
    }
  });
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [output]);
  
  useEffect(() => {
    try {
      localStorage.setItem('terminalOutput', JSON.stringify(output));
      localStorage.setItem('terminalHistory', JSON.stringify(history));
    } catch (error) {
      console.error("Failed to save terminal state to localStorage", error);
    }
  }, [output, history]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const processCommand = (command: string): string => {
    const [cmd, ...args] = command.trim().split(' ');
    switch (cmd) {
      case 'help':
        return 'Available commands: ls, cat [filename], run [filename], clear, help';
      case 'ls':
        return generateTreeString(fileSystem).trim();
      case 'cat':
        if (args.length === 0) return 'Usage: cat [filename]';
        const file = findFileByName(fileSystem, args[0]);
        return file ? file.content : `Error: File not found: ${args[0]}`;
      case 'run':
        if (args.length === 0) return 'Usage: run [filename]';
        const fileToRun = findFileByName(fileSystem, args[0]);
        return fileToRun ? `Simulating execution of ${fileToRun.name}...\nExecution complete.` : `Error: File not found: ${args[0]}`;
      case 'clear':
        setOutput([]);
        return '';
      case '':
        return '';
      default:
        return `command not found: ${cmd}`;
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const command = input.trim();
      const response = processCommand(command);
      
      const newOutput: OutputLine[] = [...output, { type: 'command', content: command }];
      if (response) {
        newOutput.push({ type: 'response', content: response });
      }
      setOutput(newOutput);

      if (command && command !== (history[0] || '')) {
        setHistory(prev => [command, ...prev]);
      }
      setHistoryIndex(-1);
      setInput('');
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (history.length > 0 && historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setInput(history[newIndex]);
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setInput(history[newIndex]);
        } else {
            setHistoryIndex(-1);
            setInput('');
        }
    }
  };

  return (
    <div className="h-64 bg-gray-900 text-white font-mono text-sm border-t border-gray-700 flex flex-col p-2" onClick={() => inputRef.current?.focus()}>
      <div ref={scrollContainerRef} className="flex-grow overflow-y-auto">
        {output.map((line, index) => (
          <div key={index}>
            {line.type === 'command' && (
              <div className="flex items-center">
                <span className="text-green-400 mr-2">$</span>
                <span>{line.content}</span>
              </div>
            )}
            {line.type === 'response' && (
              <pre className="whitespace-pre-wrap text-gray-300">{line.content}</pre>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center">
        <span className="text-green-400 mr-2">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="bg-transparent border-none outline-none w-full text-white"
          autoComplete="off"
        />
      </div>
    </div>
  );
};

export default Terminal;
