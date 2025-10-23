import React, { useState } from 'react';
import { AiFeature, Snippet } from '../types';
import Icon from './Icon';
import Loader from './Loader';

// Escape HTML meta-characters to prevent XSS
function escapeHtml(str: string) {
  return str.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
           .replace(/>/g, "&gt;")
           .replace(/"/g, "&quot;")
           .replace(/'/g, "&#39;");
}

interface AiPanelProps {
  onAction: (feature: AiFeature) => void;
  onQuery: (question: string) => void;
  output: string;
  isLoading: boolean;
  onToggleTerminal: () => void;
  onToggleGitPanel: () => void;
  snippets: Snippet[];
  onSaveSnippet: () => void;
  onInsertSnippet: (content: string) => void;
  onDeleteSnippet: (id: string) => void;
}

interface ActionButtonProps {
    feature: AiFeature;
    label: string;
    iconPath: string;
    onClick: (feature: AiFeature) => void;
}

const ACTION_BUTTONS: Omit<ActionButtonProps, 'onClick'>[] = [
    { feature: AiFeature.EXPLAIN, label: 'Explain', iconPath: 'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M11,16.5L12,15.5L13,16.5V19H11V16.5M11,5H13V14.5L12,13.5L11,14.5V5Z' },
    { feature: AiFeature.REFACTOR, label: 'Refactor', iconPath: 'M12,6V9L16,5L12,1V4A8,8 0 0,0 4,12C4,13.57 4.46,15.03 5.24,16.26L6.7,14.8C6.25,13.97 6,13 6,12A6,6 0 0,1 12,6M18.76,7.74L17.3,9.2C17.74,10.04 18,11 18,12A6,6 0 0,1 12,18V15L8,19L12,23V20A8,8 0 0,0 20,12C20,10.43 19.54,8.97 18.76,7.74Z' },
    { feature: AiFeature.DEBUG, label: 'Debug', iconPath: 'M14,12H17V14H14V12M14,8H17V10H14V8M10,12H13V14H10V12M10,8H13V10H10V8M20,8H23V10H20V8M20,12H23V14H20V12M18,20H20V22H18V20M18,4H20V6H18V4M4,20H6V22H4V20M4,4H6V6H4V4M14.28,1.45L12.86,2.86C14.39,4.4 15.33,6.5 15.72,8.75L17.2,7.28C16.4,5.27 15.5,3.45 14.28,1.45M7.28,17.2L8.75,15.72C6.5,15.33 4.4,14.39 2.86,12.86L1.45,14.28C3.45,15.5 5.27,16.4 7.28,17.2M1.45,9.72L2.86,11.14C4.4,9.61 6.5,8.67 8.75,8.28L7.28,6.8C5.27,7.6 3.45,8.5 1.45,9.72M17.2,16.72L15.72,15.25C15.33,17.5 14.39,19.6 12.86,21.14L14.28,22.55C16.4,20.55 15.5,18.55 17.2,16.72Z' },
    { feature: AiFeature.DOCS, label: 'Docs', iconPath: 'M14,17H7V15H14M17,13H7V11H17M17,9H7V7H17M19,3H5C3.89,3 3,3.89 3,5V19C3,20.1 3.9,21 5,21H19C20.1,21 21,20.1 21,19V5C21,3.89 20.1,3 19,3Z' },
];

const ActionButton: React.FC<ActionButtonProps> = ({ feature, label, iconPath, onClick }) => (
    <button
        onClick={() => onClick(feature)}
        className="flex-1 flex flex-col items-center justify-center p-3 bg-gray-700 text-gray-300 rounded-md hover:bg-blue-500 hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
        title={label}
    >
        <Icon path={iconPath} className="w-6 h-6 mb-1" />
        <span className="text-xs font-semibold">{label}</span>
    </button>
);


const AiPanel: React.FC<AiPanelProps> = ({ onAction, onQuery, output, isLoading, onToggleTerminal, onToggleGitPanel, snippets, onSaveSnippet, onInsertSnippet, onDeleteSnippet }) => {
  const [query, setQuery] = useState('');

  const handleQuerySubmit = () => {
    if (query.trim()) {
      onQuery(query);
      setQuery('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuerySubmit();
    }
  };


  return (
    <div className="w-[450px] bg-gray-800 text-gray-400 border-l border-gray-700 flex flex-col">
      <div className="p-3 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-white font-bold text-lg">AI Assistant</h2>
        <div className="flex items-center gap-2">
            <button
                onClick={onToggleGitPanel}
                className="p-1 rounded-md text-gray-400 hover:bg-gray-700 hover:text-white"
                title="Toggle Source Control"
            >
                <Icon path="M12.9,7.1L12.9,7.1C13.7,6.3 14.9,6.3 15.7,7.1L16.9,8.3C17.7,9.1 17.7,10.3 16.9,11.1L11.1,16.9C10.3,17.7 9.1,17.7 8.3,16.9L7.1,15.7C6.3,14.9 6.3,13.7 7.1,12.9L12.9,7.1M12.9,5.7L6.4,12.2C5.2,13.4 5.2,15.4 6.4,16.6L7.6,17.8C8.8,19 10.8,19 12,17.8L18.5,11.3C19.7,10.1 19.7,8.1 18.5,6.9L17.3,5.7C16.1,4.5 14.1,4.5 12.9,5.7M6,18H4V20H6V18M11,18H9V20H11V18M16,18H14V20H16V18Z" className="w-5 h-5" />
            </button>
            <button
                onClick={onToggleTerminal}
                className="p-1 rounded-md text-gray-400 hover:bg-gray-700 hover:text-white"
                title="Toggle Terminal"
            >
                <Icon path="M20,19V7H4V19H20M20,3A2,2 0 0,1 22,5V19A2,2 0 0,1 20,21H4A2,2 0 0,1 2,19V5C2,3.89 2.9,3 4,3H20M13,17V15H18V17H13M9.58,13L5.57,9H8.4L11.43,12L8.4,15H5.57L9.58,13Z" className="w-5 h-5" />
            </button>
        </div>
      </div>
      <div className="p-3 border-b border-gray-700">
        <div className="grid grid-cols-4 gap-2">
            {ACTION_BUTTONS.map(btn => (
                <ActionButton key={btn.feature} {...btn} onClick={onAction} />
            ))}
        </div>
         <div className="mt-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about the code..."
              className="flex-grow bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              onClick={handleQuerySubmit}
              disabled={isLoading || !query.trim()}
              className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              Ask AI
            </button>
          </div>
        </div>
      </div>
      <div className="flex-grow p-4 overflow-y-auto relative bg-gray-900 min-h-0">
        {isLoading ? (
          <Loader />
        ) : output ? (
          <div
            className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap"
            dangerouslySetInnerHTML={{
              __html: (() => {
                // Split output into code/non-code blocks:
                const regex = /```(\w+)?\n([\s\S]*?)```/g;
                let parts = [];
                let lastIndex = 0;
                let match;
                while ((match = regex.exec(output)) !== null) {
                  // Push preceding non-code, escaped
                  if (match.index > lastIndex) {
                    parts.push(escapeHtml(output.slice(lastIndex, match.index)));
                  }
                  // Code block
                  const lang = match[1] ? escapeHtml(match[1]) : '';
                  const code = escapeHtml(match[2]);
                  parts.push(`<pre><code class="language-${lang}">${code}</code></pre>`);
                  lastIndex = regex.lastIndex;
                }
                // Remainder after last code block
                if (lastIndex < output.length) {
                  parts.push(escapeHtml(output.slice(lastIndex)));
                }
                return parts.join('');
              })()
            }}
          />
        ) : (
          <div className="text-center text-gray-500 h-full flex items-center justify-center">
            <p>Select code and choose an action, or ask a question.</p>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 h-56 flex flex-col border-t border-gray-700">
        <div className="p-2 flex-shrink-0 font-bold text-white border-b border-gray-700 flex justify-between items-center">
          <span>Code Snippets</span>
          <button onClick={onSaveSnippet} title="Save selection as snippet" className="p-1 rounded-md hover:bg-gray-700">
            <Icon path="M17,3H5C3.89,3 3,3.89 3,5V19C3,20.1 3.9,21 5,21H19C20.1,21 21,20.1 21,19V7L17,3M15,9H5V5H15V9M12,19C10.34,19 9,17.66 9,16C9,14.34 10.34,13 12,13C13.66,13 15,14.34 15,16C15,17.66 13.66,19 12,19Z" className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-grow overflow-y-auto p-2">
          {snippets && snippets.length > 0 ? (
            <ul className="space-y-2">
              {snippets.map(snippet => (
                <li key={snippet.id} className="bg-gray-700/50 p-2 rounded-md flex justify-between items-center text-left">
                  <span className="text-sm truncate font-mono flex-1 mr-2" title={snippet.name}>{snippet.name}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => onInsertSnippet(snippet.content)} title="Insert snippet" className="p-1 text-gray-400 hover:text-white">
                      <Icon path="M9,3L3,9H6V14C6,15.1 6.9,16 8,16H11V18H13V16H16C17.1,16 18,15.1 18,14V9H21L15,3H9Z" className="w-5 h-5" />
                    </button>
                    <button onClick={() => onDeleteSnippet(snippet.id)} title="Delete snippet" className="p-1 text-red-500 hover:text-red-400">
                      <Icon path="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" className="w-5 h-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center text-gray-500 h-full flex items-center justify-center">
              <p>Select code and click save.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AiPanel;
