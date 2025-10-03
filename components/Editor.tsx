import React from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

interface CodeEditorProps {
  language: string;
  value: string;
  onChange: (value: string | undefined) => void;
  // FIX: Renamed the 'monaco' parameter to 'monacoInstance' to resolve the "'monaco' is referenced directly or indirectly in its own type annotation" error.
  onMount: (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof monaco) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ language, value, onChange, onMount }) => {
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    onMount(editor, monaco);
  };

  return (
    <div className="h-full w-full bg-gray-900">
        <Editor
            height="100%"
            language={language}
            value={value}
            theme="vs-dark"
            onChange={onChange}
            onMount={handleEditorDidMount}
            options={{
                minimap: { enabled: true },
                fontSize: 14,
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                'inlineSuggest.enabled': true, // Ensure inline suggestions are enabled
            }}
        />
    </div>
  );
};

export default CodeEditor;