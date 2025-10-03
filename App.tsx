import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { INITIAL_FILE_SYSTEM, SUPPORTED_LANGUAGES } from './constants';
import { FileItem, FolderItem, FileSystemItem, AiFeature, Snippet, Commit, GitStatus } from './types';
import FileExplorer from './components/FileExplorer';
import CodeEditor from './components/Editor';
import AiPanel from './components/AiPanel';
import Terminal from './components/Terminal';
import GitPanel from './components/GitPanel';
import { runAiTask, getAiCodeCompletion, runAiQuery } from './services/geminiService';

// --- Branching State Structure ---
interface BranchState {
  fileSystem: FolderItem;
  stagedFiles: Set<string>;
  commits: Commit[];
}

// --- Recursive Tree Helpers ---

const findFileInTree = (item: FileSystemItem, fileId: string): FileItem | null => {
  if (item.type === 'file' && item.id === fileId) return item;
  if (item.type === 'folder') {
    for (const child of item.children) {
      const found = findFileInTree(child, fileId);
      if (found) return found;
    }
  }
  return null;
};

const updateFileInTree = (
  item: FileSystemItem,
  fileId: string,
  updates: Partial<FileItem>
): FileSystemItem => {
  if (item.type === 'file' && item.id === fileId) {
    return { ...item, ...updates };
  }
  if (item.type === 'folder') {
    return {
      ...item,
      children: item.children.map(child => updateFileInTree(child, fileId, updates)),
    };
  }
  return item;
};

const findChangedFiles = (item: FileSystemItem, allFiles: FileItem[] = []): FileItem[] => {
  if (item.type === 'file' && item.gitStatus !== 'unmodified') {
    allFiles.push(item);
  } else if (item.type === 'folder') {
    item.children.forEach(child => findChangedFiles(child, allFiles));
  }
  return allFiles;
};

const updateStatusesInTree = (
  item: FileSystemItem,
  fileIds: Set<string>,
  newStatus: GitStatus
): FileSystemItem => {
  if (item.type === 'file' && fileIds.has(item.id)) {
    return { ...item, gitStatus: newStatus };
  }
  if (item.type === 'folder') {
    return {
      ...item,
      children: item.children.map(child => updateStatusesInTree(child, fileIds, newStatus)),
    };
  }
  return item;
}

const getInitialState = (): { branches: Record<string, BranchState>; current: string } => {
    try {
        const savedBranches = localStorage.getItem('branchStates');
        const savedCurrent = localStorage.getItem('currentBranch');
        if (savedBranches && savedCurrent) {
            const parsedBranches = JSON.parse(savedBranches, (key, value) => {
                if (key === 'stagedFiles') return new Set(value);
                return value;
            });
            return { branches: parsedBranches, current: savedCurrent };
        }
    } catch (error) {
        console.error("Failed to parse state from localStorage", error);
    }
    // Default initial state
    return {
        branches: {
            'main': {
                fileSystem: INITIAL_FILE_SYSTEM,
                stagedFiles: new Set(),
                commits: [],
            },
        },
        current: 'main',
    };
};


const App: React.FC = () => {
  const initialAppState = useMemo(getInitialState, []);
  const [branchStates, setBranchStates] = useState<Record<string, BranchState>>(initialAppState.branches);
  const [currentBranch, setCurrentBranch] = useState<string>(initialAppState.current);
  
  const currentBranchState = branchStates[currentBranch];

  const [activeFile, setActiveFile] = useState<FileItem | null>(() => {
    try {
      const savedActiveFileId = localStorage.getItem('activeFileId');
      if (savedActiveFileId) {
        return findFileInTree(currentBranchState.fileSystem, savedActiveFileId);
      }
    } catch (error) {
        console.error("Failed to set active file from localStorage", error);
    }
    return findFileInTree(currentBranchState.fileSystem, 'user-service-ts');
  });

  const [aiOutput, setAiOutput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTerminalVisible, setIsTerminalVisible] = useState<boolean>(false);
  const [isGitPanelVisible, setIsGitPanelVisible] = useState<boolean>(false);
  
  const [snippets, setSnippets] = useState<Snippet[]>(() => {
    try {
        const savedSnippets = localStorage.getItem('codeSnippets');
        return savedSnippets ? JSON.parse(savedSnippets) : [];
    } catch { return []; }
  });

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monaco | null>(null);
  const completionProviderRef = useRef<monaco.IDisposable | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // --- Persistence Effects ---
  useEffect(() => {
    const dataToSave = JSON.stringify(branchStates, (key, value) => {
      if (value instanceof Set) return Array.from(value);
      return value;
    });
    localStorage.setItem('branchStates', dataToSave);
  }, [branchStates]);

  useEffect(() => localStorage.setItem('currentBranch', currentBranch), [currentBranch]);
  useEffect(() => localStorage.setItem('activeFileId', activeFile?.id || ''), [activeFile]);
  useEffect(() => localStorage.setItem('codeSnippets', JSON.stringify(snippets)), [snippets]);
  
  // --- Branch-aware State Setters ---
  const setCurrentBranchState = (updater: (prevState: BranchState) => BranchState) => {
    setBranchStates(prev => ({
      ...prev,
      [currentBranch]: updater(prev[currentBranch]),
    }));
  };
  
  const handleFileSelect = useCallback((file: FileItem) => {
    const currentFileState = findFileInTree(currentBranchState.fileSystem, file.id);
    setActiveFile(currentFileState);
    setAiOutput('');
  }, [currentBranchState.fileSystem]);

  const handleCreateFile = () => {
    const filename = window.prompt("Enter new filename (e.g., app.js):");
    if (!filename) return;

    const language = window.prompt("Enter language (e.g., javascript):", "javascript") || 'plaintext';

    const newFile: FileItem = {
      id: `file-${Date.now()}`, type: 'file', name: filename.trim(),
      language: language.trim().toLowerCase(), content: ``, gitStatus: 'new'
    };
    
    setCurrentBranchState(prev => ({
        ...prev,
        fileSystem: { ...prev.fileSystem, children: [...prev.fileSystem.children, newFile] }
    }));
    setActiveFile(newFile);
  };
  
  const handleCreateFolder = () => {
    const folderName = window.prompt("Enter new folder name:");
    if (!folderName) return;

    const newFolder: FolderItem = { id: `folder-${Date.now()}`, type: 'folder', name: folderName.trim(), children: [] };
    setCurrentBranchState(prev => ({
        ...prev,
        fileSystem: { ...prev.fileSystem, children: [...prev.fileSystem.children, newFolder] }
    }));
  };

  const handleCodeChange = (value: string | undefined) => {
    if (value === undefined || !activeFile) return;
    
    const updates: Partial<FileItem> = { content: value };
    if (activeFile.gitStatus === 'unmodified') {
      updates.gitStatus = 'modified';
    }
    
    setCurrentBranchState(prev => ({
        ...prev,
        fileSystem: updateFileInTree(prev.fileSystem, activeFile.id, updates) as FolderItem,
    }));
    setActiveFile(prev => prev ? { ...prev, ...updates } : null);
  };
  
  const handleEditorMount = (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof monaco) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;
  };

  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco || !activeFile) return;
    completionProviderRef.current?.dispose();
    completionProviderRef.current = monaco.languages.registerInlineCompletionsProvider(activeFile.language, {
        provideInlineCompletions: async (model, position, context, token) => {
          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
          return new Promise(resolve => {
            debounceTimerRef.current = window.setTimeout(async () => {
              const codeBefore = model.getValueInRange({ startLineNumber: 1, startColumn: 1, endLineNumber: position.lineNumber, endColumn: position.column });
              const codeAfter = model.getValueInRange({ startLineNumber: position.lineNumber, startColumn: position.column, endLineNumber: model.getLineCount(), endColumn: model.getLineMaxColumn(model.getLineCount()) });
              const suggestion = await getAiCodeCompletion(activeFile.language, codeBefore, codeAfter);
              if (token.isCancellationRequested || !suggestion) return resolve({ items: [] });
              resolve({ items: [{ insertText: suggestion }] });
            }, 500);
          });
        },
      }
    );
    return () => completionProviderRef.current?.dispose();
  }, [activeFile?.id, activeFile?.language]);


  // --- AI Handlers ---
  const handleAiAction = async (feature: AiFeature) => {
    if (!activeFile || !editorRef.current) return;
    const editor = editorRef.current;
    const selection = editor.getSelection();
    let codeToProcess = (selection && !selection.isEmpty()) ? editor.getModel()?.getValueInRange(selection) || '' : editor.getValue();
    setIsLoading(true); setAiOutput('');
    const result = await runAiTask(feature, activeFile.language, codeToProcess);
    setAiOutput(result); setIsLoading(false);
  };

  const handleAiQuery = async (question: string) => {
    if (!activeFile) return;
    setIsLoading(true); setAiOutput('');
    const result = await runAiQuery(activeFile.language, activeFile.content, question);
    setAiOutput(result); setIsLoading(false);
  };
  
  // --- Snippet Handlers ---
  const handleSaveSnippet = () => {
    const selection = editorRef.current?.getSelection();
    if (!selection || selection.isEmpty()) return alert("Please select code to save.");
    const content = editorRef.current?.getModel()?.getValueInRange(selection);
    if (!content) return;
    const name = window.prompt("Enter a name for your snippet:");
    if (!name) return;
    const newSnippet: Snippet = { id: `snippet-${Date.now()}`, name: name.trim(), content };
    setSnippets(prev => [newSnippet, ...prev]);
  };

  const handleInsertSnippet = (content: string) => {
    const editor = editorRef.current;
    const selection = editor?.getSelection();
    if (!editor || !selection) return;
    editor.executeEdits('snippet-inserter', [{ range: selection, text: content, forceMoveMarkers: true }]);
    editor.focus();
  };

  const handleDeleteSnippet = (id: string) => {
    if (window.confirm("Delete this snippet?")) setSnippets(prev => prev.filter(s => s.id !== id));
  };
  
  // --- Git and Branching Handlers ---
  const handleStage = (fileId: string) => setCurrentBranchState(prev => ({ ...prev, stagedFiles: new Set(prev.stagedFiles).add(fileId) }));
  const handleUnstage = (fileId: string) => setCurrentBranchState(prev => { const next = new Set(prev.stagedFiles); next.delete(fileId); return {...prev, stagedFiles: next }; });
  const handleStageAll = () => {
    const allChangedIds = findChangedFiles(currentBranchState.fileSystem).map(f => f.id);
    setCurrentBranchState(prev => ({...prev, stagedFiles: new Set(allChangedIds) }));
  };
  const handleCommit = (message: string) => {
    if (currentBranchState.stagedFiles.size === 0) return alert("No files staged to commit.");
    const newCommit: Commit = { id: `commit-${Date.now()}`, message, timestamp: new Date().toISOString() };
    
    setCurrentBranchState(prev => ({
        ...prev,
        commits: [newCommit, ...prev.commits],
        fileSystem: updateStatusesInTree(prev.fileSystem, prev.stagedFiles, 'unmodified') as FolderItem,
        stagedFiles: new Set(),
    }));
  };

  const handleCreateBranch = () => {
    const newBranchName = window.prompt("Enter new branch name:");
    if (!newBranchName || branchStates[newBranchName]) return alert(newBranchName ? "Branch already exists." : "Invalid branch name.");
    setBranchStates(prev => ({
      ...prev,
      [newBranchName]: { ...prev[currentBranch] }
    }));
    setCurrentBranch(newBranchName);
  };

  const handleSwitchBranch = (branchName: string) => {
    if (branchName === currentBranch) return;
    setCurrentBranch(branchName);
    const newBranchFS = branchStates[branchName].fileSystem;
    const newActiveFile = activeFile ? findFileInTree(newBranchFS, activeFile.id) : findFileInTree(newBranchFS, 'user-service-ts');
    setActiveFile(newActiveFile || (newBranchFS.children.find(c => c.type === 'file') as FileItem || null));
  };

  const handleToggleTerminal = () => setIsTerminalVisible(prev => !prev);
  const handleToggleGitPanel = () => setIsGitPanelVisible(prev => !prev);
  const getMonacoLanguage = (language: string): string => SUPPORTED_LANGUAGES.has(language) ? language : 'plaintext';

  const allChangedFiles = useMemo(() => findChangedFiles(currentBranchState.fileSystem), [currentBranchState.fileSystem]);
  const unstagedFiles = useMemo(() => allChangedFiles.filter(f => !currentBranchState.stagedFiles.has(f.id)), [allChangedFiles, currentBranchState.stagedFiles]);
  const stagedFileItems = useMemo(() => Array.from(currentBranchState.stagedFiles).map(id => findFileInTree(currentBranchState.fileSystem, id)).filter(Boolean) as FileItem[], [currentBranchState.stagedFiles, currentBranchState.fileSystem]);


  return (
    <div className="flex h-screen w-screen bg-gray-900 text-white font-sans">
      {isGitPanelVisible ? (
        <GitPanel
            changedFiles={unstagedFiles}
            stagedFiles={stagedFileItems}
            commits={currentBranchState.commits}
            currentBranch={currentBranch}
            allBranches={Object.keys(branchStates)}
            onStage={handleStage}
            onUnstage={handleUnstage}
            onStageAll={handleStageAll}
            onCommit={handleCommit}
            onSwitchBranch={handleSwitchBranch}
            onCreateBranch={handleCreateBranch}
        />
      ) : (
        <FileExplorer 
            fileSystem={currentBranchState.fileSystem} 
            activeFile={activeFile} 
            currentBranch={currentBranch}
            onFileSelect={handleFileSelect}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
        />
      )}
      <div className="flex-grow flex flex-col">
        <div className="flex-grow min-h-0">
          {activeFile ? (
            <CodeEditor
              language={getMonacoLanguage(activeFile.language)}
              value={activeFile.content || ''}
              onChange={handleCodeChange}
              onMount={handleEditorMount}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select a file to begin editing.
            </div>
          )}
        </div>
        {isTerminalVisible && <Terminal fileSystem={currentBranchState.fileSystem} />}
      </div>
      <AiPanel 
        onAction={handleAiAction} 
        onQuery={handleAiQuery}
        output={aiOutput} 
        isLoading={isLoading}
        onToggleTerminal={handleToggleTerminal}
        onToggleGitPanel={handleToggleGitPanel}
        snippets={snippets}
        onSaveSnippet={handleSaveSnippet}
        onInsertSnippet={handleInsertSnippet}
        onDeleteSnippet={handleDeleteSnippet}
      />
    </div>
  );
};

export default App;