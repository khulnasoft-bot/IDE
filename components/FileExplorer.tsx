import React, { useState } from 'react';
import { FileItem, FolderItem, FileSystemItem } from '../types';
import Icon from './Icon';

interface FileExplorerProps {
  fileSystem: FolderItem;
  activeFile: FileItem | null;
  currentBranch: string;
  onFileSelect: (file: FileItem) => void;
  onCreateFile: () => void;
  onCreateFolder: () => void;
}

const ICONS = {
    typescript: "M4,2H20A2,2 0 0,1 22,4V20A2,2 0 0,1 20,22H4A2,2 0 0,1 2,20V4A2,2 0 0,1 4,2M13.2,16.5H15.5V11.2H18.2V9H10.5V11.2H13.2V16.5M6,16.5H8.2V13.2H5.5V11.2H6C7.5,11.2 8.2,10.5 8.2,9.2V9H5.5V7H10.5V9C10.5,10.8 9.2,11.8 8.2,12V16.5H6Z",
    python: "M16.5,9H13.5V12H16.5V15H13.5V18H11.5V15H8.5V12H11.5V9H8.5V6H11.5V9H13.5V6H16.5V9M4,2H20A2,2 0 0,1 22,4V20A2,2 0 0,1 20,22H4A2,2 0 0,1 2,20V4A2,2 0 0,1 4,2Z",
    javascript: "M20,2H4A2,2 0 0,0 2,4V20A2,2 0 0,0 4,22H20A2,2 0 0,0 22,20V4A2,2 0 0,0 20,2M13,18.5H11V13.8L10.2,14.2V12.7L12.9,11.2H13V18.5M17,18.5H15V11.2H17V18.5Z",
    plaintext: "M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2Z",
    folderOpen: "M19,20H5V6H19M19,4H12L10,2H5A2,2 0 0,0 3,4V20A2,2 0 0,0 5,22H19A2,2 0 0,0 21,20V6A2,2 0 0,0 19,4Z",
    folderClosed: "M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z"
};

const GitStatusIndicator: React.FC<{ status: FileItem['gitStatus'] }> = ({ status }) => {
  if (status === 'modified') {
    return <span className="text-yellow-400 font-bold text-sm" title="Modified">M</span>;
  }
  if (status === 'new') {
    return <span className="text-green-400 font-bold text-sm" title="Untracked">U</span>;
  }
  return null;
};


const FileSystemEntry: React.FC<{
  item: FileSystemItem;
  level: number;
  activeFile: FileItem | null;
  onFileSelect: (file: FileItem) => void;
  expandedFolders: Set<string>;
  onToggleFolder: (folderId: string) => void;
}> = ({ item, level, activeFile, onFileSelect, expandedFolders, onToggleFolder }) => {
  const paddingLeft = `${level * 16}px`;

  if (item.type === 'folder') {
    const isExpanded = expandedFolders.has(item.id);
    return (
      <div>
        <div
          onClick={() => onToggleFolder(item.id)}
          className="flex items-center p-2 rounded cursor-pointer hover:bg-gray-700/50"
          style={{ paddingLeft }}
        >
          <Icon path={isExpanded ? ICONS.folderOpen : ICONS.folderClosed} className="w-5 h-5 mr-2 text-yellow-400" />
          <span>{item.name}</span>
        </div>
        {isExpanded && (
          <div>
            {item.children.map(child => (
              <FileSystemEntry
                key={child.id}
                item={child}
                level={level + 1}
                activeFile={activeFile}
                onFileSelect={onFileSelect}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // It's a file
  const iconPath = ICONS[item.language as keyof typeof ICONS] ?? ICONS.plaintext;
  return (
    <div
      onClick={() => onFileSelect(item)}
      className={`flex items-center justify-between p-2 rounded cursor-pointer ${
        activeFile?.id === item.id ? 'bg-gray-700 text-white' : 'hover:bg-gray-700/50'
      }`}
      style={{ paddingLeft }}
    >
      <div className="flex items-center truncate">
        <Icon path={iconPath} className="w-5 h-5 mr-2 text-blue-400" />
        <span className="truncate">{item.name}</span>
      </div>
      <div className="pr-2">
        <GitStatusIndicator status={item.gitStatus} />
      </div>
    </div>
  );
};

const FileExplorer: React.FC<FileExplorerProps> = ({ fileSystem, activeFile, currentBranch, onFileSelect, onCreateFile, onCreateFolder }) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set(['src-folder']));

  const handleToggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  return (
    <div className="w-64 bg-gray-800 text-gray-400 border-r border-gray-700 flex flex-col">
      <div className="p-2 font-bold text-white border-b border-gray-700 flex justify-between items-center">
        <span>EXPLORER</span>
        <div className="flex items-center gap-1">
            <button onClick={onCreateFile} title="New File" className="p-1 rounded-md hover:bg-gray-700">
                <Icon path="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M13,9V3.5L18.5,9H13M12,14H10V17H8V14H5V12H8V9H10V12H12V14Z" className="w-5 h-5" />
            </button>
            <button onClick={onCreateFolder} title="New Folder" className="p-1 rounded-md hover:bg-gray-700">
                <Icon path="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z" className="w-5 h-5" />
            </button>
        </div>
      </div>
      <div className="flex-grow p-2 overflow-y-auto">
        {fileSystem.children.map(item => (
          <FileSystemEntry
            key={item.id}
            item={item}
            level={0}
            activeFile={activeFile}
            onFileSelect={onFileSelect}
            expandedFolders={expandedFolders}
            onToggleFolder={handleToggleFolder}
          />
        ))}
      </div>
      <div className="p-2 border-t border-gray-700 text-xs flex items-center">
        <Icon path="M12.9,7.1L12.9,7.1C13.7,6.3 14.9,6.3 15.7,7.1L16.9,8.3C17.7,9.1 17.7,10.3 16.9,11.1L11.1,16.9C10.3,17.7 9.1,17.7 8.3,16.9L7.1,15.7C6.3,14.9 6.3,13.7 7.1,12.9L12.9,7.1M12.9,5.7L6.4,12.2C5.2,13.4 5.2,15.4 6.4,16.6L7.6,17.8C8.8,19 10.8,19 12,17.8L18.5,11.3C19.7,10.1 19.7,8.1 18.5,6.9L17.3,5.7C16.1,4.5 14.1,4.5 12.9,5.7M6,18H4V20H6V18M11,18H9V20H11V18M16,18H14V20H16V18Z" className="w-4 h-4 mr-2" />
        <span className="font-semibold">{currentBranch}</span>
      </div>
    </div>
  );
};

export default FileExplorer;