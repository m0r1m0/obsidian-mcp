# Obsidian MCP Server

A Model Context Protocol (MCP) server for interacting with Obsidian vaults. This server allows Claude and other MCP clients to search, read, create, and update notes in your Obsidian vault.

## Features

- **Search Notes**: Search by filename, content, tags, or regex patterns
- **Read Notes**: Retrieve the full content of any note in your vault
- **Create Notes**: Create new markdown files in your vault
- **Update Notes**: Modify existing notes with new content
- **Security**: Restricts access to files within the vault directory only

## Installation

1. Clone or download this repository
2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

## Usage

### Starting the Server

Run the server with your Obsidian vault path:

```bash
npm start -- --vault-path /path/to/your/obsidian/vault
```

Or for development:

```bash
npm run dev -- --vault-path /path/to/your/obsidian/vault
```

### Available Tools

#### 1. search_notes

Search for notes in your vault using different methods:

- **Parameters:**
  - `query` (string): The search term
  - `search_type` (string): One of "filename", "content", "tag", or "regex"

- **Example:**
  ```json
  {
    "query": "machine learning",
    "search_type": "content"
  }
  ```

#### 2. read_note

Read the full content of a specific note:

- **Parameters:**
  - `file_path` (string): Path to the note relative to vault root

- **Example:**
  ```json
  {
    "file_path": "Daily Notes/2024-01-15.md"
  }
  ```

#### 3. create_note

Create a new note in your vault:

- **Parameters:**
  - `file_path` (string): Path where the note should be created
  - `content` (string): Content of the new note

- **Example:**
  ```json
  {
    "file_path": "Projects/New Project.md",
    "content": "# New Project\n\nThis is a new project note."
  }
  ```

#### 4. update_note

Update an existing note:

- **Parameters:**
  - `file_path` (string): Path to the existing note
  - `content` (string): New content for the note

- **Example:**
  ```json
  {
    "file_path": "Projects/Existing Project.md",
    "content": "# Updated Project\n\nThis note has been updated."
  }
  ```

## Search Types

### Filename Search
Searches for files whose names contain the query string (case-insensitive).

### Content Search  
Searches within the content of all markdown files for the query string (case-insensitive).

### Tag Search
Searches for notes containing specific tags. Use the tag name without the `#` symbol.

### Regex Search
Searches using regular expression patterns. Supports full regex syntax.

## Error Handling

The server provides detailed error messages for common issues:
- Invalid vault path
- File access permissions
- File not found
- Invalid regex patterns
- Attempts to access files outside the vault directory

## Requirements

- Node.js 22 or higher
- TypeScript 5 or higher
- An existing Obsidian vault

## Security

This server restricts all file operations to within the specified vault directory. It cannot access files outside your vault, ensuring your system remains secure.

## Development

### Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Build and run the server
- `npm start` - Run the compiled server
- `npm run clean` - Remove build artifacts

### Project Structure

```
src/
├── index.ts           # Main server entry point
├── obsidian-service.ts # Core service logic
└── types.ts           # TypeScript type definitions
```