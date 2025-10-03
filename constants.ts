import { FolderItem, AiFeature } from './types';

export const INITIAL_FILE_SYSTEM: FolderItem = {
  id: 'root',
  type: 'folder',
  name: 'ai-code-assistant',
  children: [
    {
      id: 'src-folder',
      type: 'folder',
      name: 'src',
      children: [
        {
          id: 'user-service-ts',
          type: 'file',
          name: 'user-service.ts',
          language: 'typescript',
          gitStatus: 'unmodified',
          content: `import { v4 as uuidv4 } from 'uuid';

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

class UserService {
  private users: User[] = [];

  createUser(name: string, email: string): User {
    if (!name || !email) {
      throw new Error('Name and email are required');
    }
    
    const newUser: User = {
      id: uuidv4(),
      name,
      email,
      createdAt: new Date(),
    };
    
    this.users.push(newUser);
    return newUser;
  }

  getUserById(id: string): User | undefined {
    return this.users.find(user => user.id === id);
  }

  // This function is a bit complex. Maybe AI can explain it?
  getUsersSortedByCreationDate(order: 'asc' | 'desc' = 'desc') {
    return [...this.users].sort((a, b) => {
      if (order === 'asc') {
        return a.createdAt.getTime() - b.createdAt.getTime();
      } else {
        return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });
  }
}`,
        },
        {
          id: 'data-analyzer-py',
          type: 'file',
          name: 'data_analyzer.py',
          language: 'python',
          gitStatus: 'unmodified',
          content: `import pandas as pd
import numpy as np

class DataAnalyzer:
    def __init__(self, data_source):
        self.data_source = data_source
        self.df = None

    def load_data(self):
        # In a real app, this would load from a file or API
        if isinstance(self.data_source, dict):
            self.df = pd.DataFrame(self.data_source)
        else:
            # Assuming it's a file path
            self.df = pd.read_csv(self.data_source)

    def compute_statistics(self):
        if self.df is None:
            raise ValueError("Data not loaded. Call load_data() first.")
        
        # This seems inefficient, could it be refactored?
        summary = {}
        for col in self.df.columns:
            if np.issubdtype(self.df[col].dtype, np.number):
                summary[col] = {
                    'mean': self.df[col].mean(),
                    'median': self.df[col].median(),
                    'std_dev': self.df[col].std()
                }
        return summary

    def find_anomalies(self, column, threshold=2):
        # A simple anomaly detection using Z-score
        # There might be bugs here
        if self.df is None or column not in self.df.columns:
            return []
        
        col_data = self.df[column]
        mean = col_data.mean()
        std = col_data.std()
        
        anomalies = []
        for index, value in col_data.items():
            z_score = (value - mean) / std
            if abs(z_score) > threshold:
                anomalies.append((index, value))
        return anomalies

# Example Usage
# sample_data = {'A': [1, 2, 3, 4, 100], 'B': [5, 6, 7, 8, 9]}
# analyzer = DataAnalyzer(sample_data)
# analyzer.load_data()
# print(analyzer.compute_statistics())
# print(analyzer.find_anomalies('A'))
`,
        },
      ],
    },
  ],
};

export const PROMPT_TEMPLATES: Record<AiFeature, (language: string, code: string) => string> = {
  [AiFeature.EXPLAIN]: (language, code) => `
    You are an expert ${language} developer and a skilled code explainer.
    Explain the following code snippet in simple, clear terms. 
    Focus on its purpose, key logic, and how it works. Use markdown for formatting.

    Code:
    \`\`\`${language}
    ${code}
    \`\`\`
  `,
  [AiFeature.REFACTOR]: (language, code) => `
    You are an expert ${language} developer specializing in code optimization and clean code.
    Refactor the following code to improve readability, maintainability, and performance.
    Keep the functionality identical. Provide the refactored code inside a markdown code block
    and briefly explain the key changes you made.

    Code to refactor:
    \`\`\`${language}
    ${code}
    \`\`\`
  `,
  [AiFeature.DEBUG]: (language, code) => `
    You are a senior ${language} developer with expert debugging skills.
    Analyze this code for potential bugs, runtime errors, logic issues, or security vulnerabilities.
    If you find any issues, describe them clearly and provide a corrected version of the code
    inside a markdown code block. If no issues are found, state that the code looks solid.

    Code to analyze:
    \`\`\`${language}
    ${code}
    \`\`\`
  `,
  [AiFeature.DOCS]: (language, code) => `
    You are an expert technical writer and ${language} developer.
    Generate clear and concise documentation for the following code.
    This could include a summary, descriptions of parameters, return values, and usage examples.
    For functions, generate docstrings in a standard format for the language.
    For classes, document the class and its public methods.

    Code to document:
    \`\`\`${language}
    ${code}
    \`\`\`
  `,
};

export const QUERY_PROMPT_TEMPLATE = (language: string, code: string, question: string): string => `
You are an expert AI assistant and ${language} developer.
Based on the code context provided, answer the user's question. Format your response using markdown.

Code Context:
\`\`\`${language}
${code}
\`\`\`

User Question:
"${question}"
`;

export const COMPLETION_PROMPT_TEMPLATE = (language: string, codeBefore: string, codeAfter: string): string => `
You are an AI programming assistant specializing in ${language}.
Complete the code snippet provided. Your response should be concise and contain only the code that should be inserted at the cursor position.
Do not include any explanations, markdown formatting, or the original code.

Here is the code before the cursor:
\`\`\`${language}
${codeBefore}
\`\`\`

Here is the code after the cursor:
\`\`\`${language}
${codeAfter}
\`\`\`

Provide only the code completion that should come next:
`;

export const SUPPORTED_LANGUAGES = new Set([
    'javascript',
    'typescript',
    'python',
    'java',
    'csharp',
    'cpp',
    'go',
    'rust',
    'php',
    'ruby',
    'sql',
    'html',
    'css',
    'json',
    'yaml',
    'markdown',
]);
