export interface SearchResult {
  filePath: string;
  fileName: string;
  matchedContent?: string;
  createdAt: Date;
  updatedAt: Date;
  fileSize: number;
  tags: string[];
  matchedLineNumbers?: number[];
}

export type SearchType = "filename" | "content" | "tag" | "regex";

export interface SearchParams {
  query: string;
  searchType: SearchType;
}

export interface ReadNoteParams {
  filePath: string;
}

export interface CreateNoteParams {
  filePath: string;
  content: string;
}

export interface UpdateNoteParams {
  filePath: string;
  content: string;
}