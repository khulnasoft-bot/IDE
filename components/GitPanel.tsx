import React, { useState } from 'react';
import { FileItem, Commit } from '../types';
import Icon from './Icon';

interface GitPanelProps {
  changedFiles: FileItem[];
  stagedFiles: FileItem[];
  commits: Commit[];
  currentBranch: string;
  allBranches: string[];
  onStage: (fileId: string) => void;
  onUnstage: (fileId:string) => void;
  onStageAll: () => void;
  onCommit: (message: string) => void;
  onSwitchBranch: (branch: string) => void;
  onCreateBranch: () => void;
}

const ICONS = {
    typescript: "M4,2H20A2,2 0 0,1 22,4V20A2,2 0 0,1 20,22H4A2,2 0 0,1 2,20V4A2,2 0 0,1 4,2M13.2,16.5H15.5V11.2H18.2V9H10.5V11.2H13.2V16.5M6,16.5H8.2V13.2H5.5V11.2H6C7.5,11.2 8.2,10.5 8.2,9.2V9H5.5V7H10.5V9C10.5,10.8 9.2,11.8 8.2,12V16.5H6Z",
    python: "M16.5,9H13.5V12H16.5V15H13.5V18H11.5V15H8.5V12H11.5V9H8.5V6H11.5V9H13.5V6H16.5V9M4,2H20A2,2 0 0,1 22,4V20A2,2 0 0,1 20,22H4A2,2 0 0,1 2,20V4A2,2 0 0,1 4,2Z",
    javascript: "M20,2H4A2,2 0 0,0 2,4V20A2,2 0 0,0 4,22H20A2,2 0 0,0 22,20V4A2,2 0 0,0 20,2M13,18.5H11V13.8L10.2,14.2V12.7L12.9,11.2H13V18.5M17,18.5H15V11.2H17V18.5Z",
    plaintext: "M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2Z",
};

const GitFileItem: React.FC<{ file: FileItem; onAction: () => void; actionIcon: string; actionTitle: string }> = ({ file, onAction, actionIcon, actionTitle }) => (
  <div className="flex items-center p-1.5 rounded hover:bg-gray-700/50 group">
    <Icon path={ICONS[file.language as keyof typeof ICONS] ?? ICONS.plaintext} className="w-5 h-5 mr-2 text-blue-400 flex-shrink-0" />
    <span className="truncate flex-grow">{file.name}</span>
    <button onClick={onAction} title={actionTitle} className="p-1 rounded opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white">
      <Icon path={actionIcon} className="w-5 h-5" />
    </button>
  </div>
);

const GitPanel: React.FC<GitPanelProps> = ({ changedFiles, stagedFiles, commits, currentBranch, allBranches, onStage, onUnstage, onStageAll, onCommit, onSwitchBranch, onCreateBranch }) => {
  const [commitMessage, setCommitMessage] = useState('');

  const handleCommit = () => {
    if (commitMessage.trim() && stagedFiles.length > 0) {
      onCommit(commitMessage.trim());
      setCommitMessage('');
    }
  };

  return (
    <div className="w-64 bg-gray-800 text-gray-400 border-r border-gray-700 flex flex-col">
      <div className="p-2 font-bold text-white border-b border-gray-700">
        SOURCE CONTROL
      </div>

       <div className="p-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <select 
            value={currentBranch} 
            onChange={(e) => onSwitchBranch(e.target.value)}
            className="flex-grow bg-gray-900 border border-gray-700 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {allBranches.map(branch => <option key={branch} value={branch}>{branch}</option>)}
          </select>
          <button onClick={onCreateBranch} title="New Branch" className="p-1.5 rounded-md hover:bg-gray-700">
            <Icon path="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-2 border-b border-gray-700">
        <textarea
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Commit message"
          className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 h-20 resize-none"
        />
        <button
          onClick={handleCommit}
          disabled={!commitMessage.trim() || stagedFiles.length === 0}
          className="w-full mt-2 bg-blue-500 text-white p-2 rounded-md text-sm font-semibold hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          Commit
        </button>
      </div>
      <div className="flex-grow overflow-y-auto">
        {/* Staged Files */}
        <div className="p-2">
          <h3 className="text-xs font-bold uppercase text-gray-500 mb-1">Staged Changes ({stagedFiles.length})</h3>
          {stagedFiles.length > 0 ? (
            stagedFiles.map(file => (
              <GitFileItem key={file.id} file={file} onAction={() => onUnstage(file.id)} actionIcon="M19,13H5V11H19V13Z" actionTitle="Unstage Changes" />
            ))
          ) : <p className="text-xs text-gray-500 px-1.5">No staged changes.</p>}
        </div>
        {/* Unstaged Files */}
        <div className="p-2 border-t border-gray-700">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-xs font-bold uppercase text-gray-500">Changes ({changedFiles.length})</h3>
            <button onClick={onStageAll} title="Stage All Changes" className="p-1 rounded text-gray-400 hover:text-white disabled:opacity-50" disabled={changedFiles.length === 0}>
                <Icon path="M19,13H5V11H19V13Z" className="w-5 h-5 transform rotate-90" />
            </button>
          </div>
          {changedFiles.length > 0 ? (
             changedFiles.map(file => (
              <GitFileItem key={file.id} file={file} onAction={() => onStage(file.id)} actionIcon="M19,13H13V19H11V13H5V11H19V13Z" actionTitle="Stage Changes" />
            ))
          ) : <p className="text-xs text-gray-500 px-1.5">No changes.</p>}
        </div>
        {/* Commit History */}
        <div className="p-2 border-t border-gray-700">
            <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">History</h3>
            <div className="space-y-2">
                {commits.slice(0, 5).map(commit => (
                    <div key={commit.id} className="text-xs text-gray-400">
                        <p className="font-semibold text-gray-300 truncate" title={commit.message}>{commit.message}</p>
                        <p className="text-gray-500">{new Date(commit.timestamp).toLocaleString()}</p>
                    </div>
                ))}
            </div>
        </div>
      </div>
       <div className="p-2 border-t border-gray-700">
          <button onClick={() => alert("Simulated push to remote repository.")} className="w-full bg-gray-700 text-white p-2 rounded-md text-sm font-semibold hover:bg-gray-600">
            Push
          </button>
       </div>
    </div>
  );
};

export default GitPanel;