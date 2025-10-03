export type GitStatus = 'unmodified' | 'modified' | 'new';

export interface FileItem {
  id: string;
  type: 'file';
  name: string;
  language: string;
  content: string;
  gitStatus: GitStatus;
}

export interface FolderItem {
  id: string;
  type: 'folder';
  name: string;
  children: FileSystemItem[];
}

export type FileSystemItem = FileItem | FolderItem;


export enum AiFeature {
  EXPLAIN = 'EXPLAIN',
  REFACTOR = 'REFACTOR',
  DEBUG = 'DEBUG',
  DOCS = 'DOCS',
}

export interface Snippet {
  id: string;
  name: string;
  content: string;
}

export interface Commit {
  id: string;
  message: string;
  timestamp: string;
}
