import { Hono } from 'hono';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Execute AppleScript using spawn with stdin to avoid shell escaping issues
 */
function runOsascript(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('osascript', ['-s', 's'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(stderr || `osascript exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });

    // Write script to stdin and close
    child.stdin.write(script);
    child.stdin.end();
  });
}

const app = new Hono();

interface NoteFolder {
  id: string;
  name: string;
  noteCount: number;
}

interface NoteItem {
  id: string;
  name: string;
  folder: string;
  createdAt: string;
  modifiedAt: string;
  snippet: string;  // First 100 chars preview
}

interface NoteContent {
  id: string;
  name: string;
  body: string;      // Plain text content
  htmlBody: string;  // HTML content (for rich text)
  folder: string;
  createdAt: string;
  modifiedAt: string;
}

/**
 * Check if running on macOS
 */
function isMacOS(): boolean {
  return process.platform === 'darwin';
}

/**
 * Execute AppleScript and return result
 * Uses spawn with stdin to avoid shell escaping issues
 */
async function runAppleScript(script: string): Promise<string> {
  if (!isMacOS()) {
    throw new Error('Apple Notes import is only available on macOS');
  }

  try {
    return await runOsascript(script);
  } catch (error) {
    console.error('AppleScript error:', error);
    throw new Error('Failed to execute AppleScript. Make sure Notes app permissions are granted.');
  }
}

/**
 * GET /api/apple-notes/check
 * Check if Apple Notes import is available (macOS only)
 */
app.get('/check', async (c) => {
  if (!isMacOS()) {
    return c.json({ available: false, reason: 'Not running on macOS' });
  }

  // Try to access Notes app
  try {
    await runAppleScript('tell application "Notes" to return name of default account');
    return c.json({ available: true });
  } catch {
    return c.json({
      available: false,
      reason: 'Cannot access Notes app. Please grant permissions in System Settings > Privacy & Security > Automation.'
    });
  }
});

/**
 * GET /api/apple-notes/folders
 * List all folders in Apple Notes
 */
app.get('/folders', async (c) => {
  try {
    // Use ASCII delimiters to avoid conflicts with folder names
    const script = `
      tell application "Notes"
        set output to ""
        set folderCount to count of folders
        repeat with i from 1 to folderCount
          set f to folder i
          set folderName to name of f
          set noteCount to count of notes of f
          set folderId to id of f
          set output to output & folderId & (ASCII character 30) & folderName & (ASCII character 30) & noteCount
          if i < folderCount then
            set output to output & (ASCII character 31)
          end if
        end repeat
        return output
      end tell
    `;

    const result = await runAppleScript(script);

    if (!result) {
      return c.json({ folders: [] });
    }

    // ASCII 31 = unit separator between items, ASCII 30 = record separator within item
    const folders: NoteFolder[] = result.split(String.fromCharCode(31)).map(item => {
      const parts = item.split(String.fromCharCode(30));
      return {
        id: parts[0] || '',
        name: parts[1] || 'Unknown',
        noteCount: parseInt(parts[2]) || 0,
      };
    }).filter(f => f.id && f.name !== 'Recently Deleted');

    return c.json({ folders });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

/**
 * GET /api/apple-notes/notes?folder=<folderId>
 * List notes in a folder (or all notes if no folder specified)
 */
app.get('/notes', async (c) => {
  const folderId = c.req.query('folder');

  try {
    // Use ASCII delimiters and limit to first 100 notes for performance
    const RS = '(ASCII character 30)';  // Record separator
    const US = '(ASCII character 31)';  // Unit separator

    let script: string;

    if (folderId) {
      script = `
        tell application "Notes"
          set output to ""
          set targetFolder to first folder whose id is "${folderId}"
          set folderName to name of targetFolder
          set noteItems to notes of targetFolder
          set noteCount to count of noteItems
          if noteCount > 50 then set noteCount to 50
          repeat with i from 1 to noteCount
            set n to item i of noteItems
            set noteName to name of n
            set noteId to id of n
            set noteCreated to creation date of n as text
            set noteModified to modification date of n as text
            set noteBody to plaintext of n
            if length of noteBody > 100 then
              set noteSnippet to text 1 thru 100 of noteBody
            else
              set noteSnippet to noteBody
            end if
            set output to output & noteId & ${RS} & noteName & ${RS} & folderName & ${RS} & noteCreated & ${RS} & noteModified & ${RS} & noteSnippet
            if i < noteCount then
              set output to output & ${US}
            end if
          end repeat
          return output
        end tell
      `;
    } else {
      script = `
        tell application "Notes"
          set output to ""
          set noteItems to notes
          set noteCount to count of noteItems
          if noteCount > 50 then set noteCount to 50
          repeat with i from 1 to noteCount
            set n to item i of noteItems
            set noteName to name of n
            set noteId to id of n
            try
              try
            set noteFolder to name of container of n
          on error
            set noteFolder to "Notes"
          end try
            on error
              set noteFolder to "Notes"
            end try
            set noteCreated to creation date of n as text
            set noteModified to modification date of n as text
            set noteBody to plaintext of n
            if length of noteBody > 100 then
              set noteSnippet to text 1 thru 100 of noteBody
            else
              set noteSnippet to noteBody
            end if
            set output to output & noteId & ${RS} & noteName & ${RS} & noteFolder & ${RS} & noteCreated & ${RS} & noteModified & ${RS} & noteSnippet
            if i < noteCount then
              set output to output & ${US}
            end if
          end repeat
          return output
        end tell
      `;
    }

    const result = await runAppleScript(script);

    if (!result) {
      return c.json({ notes: [] });
    }

    // ASCII 31 = unit separator between items, ASCII 30 = record separator within item
    const notes: NoteItem[] = result.split(String.fromCharCode(31)).map(item => {
      const parts = item.split(String.fromCharCode(30));
      return {
        id: (parts[0] || '').replace(/^"|"$/g, ''),  // Remove extra quotes
        name: parts[1] || 'Untitled',
        folder: parts[2] || '',
        createdAt: parts[3] || '',
        modifiedAt: parts[4] || '',
        snippet: parts[5] || '',
      };
    }).filter(n => n.id);

    return c.json({ notes });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

/**
 * POST /api/apple-notes/import
 * Import selected notes by their IDs
 */
app.post('/import', async (c) => {
  const body = await c.req.json();
  const noteIds: string[] = body.noteIds;

  if (!noteIds || !Array.isArray(noteIds) || noteIds.length === 0) {
    return c.json({ error: 'noteIds array is required' }, 400);
  }

  try {
    const importedNotes: NoteContent[] = [];
    const RS = String.fromCharCode(30);  // Record separator

    for (const noteId of noteIds) {
      const script = `
        tell application "Notes"
          set n to first note whose id is "${noteId}"
          set noteName to name of n
          set noteBody to plaintext of n
          set noteHtml to body of n
          try
            set noteFolder to name of container of n
          on error
            set noteFolder to "Notes"
          end try
          set noteCreated to creation date of n as text
          set noteModified to modification date of n as text
          return noteName & (ASCII character 30) & noteBody & (ASCII character 30) & noteHtml & (ASCII character 30) & noteFolder & (ASCII character 30) & noteCreated & (ASCII character 30) & noteModified
        end tell
      `;

      const result = await runAppleScript(script);
      const parts = result.split(RS);

      importedNotes.push({
        id: noteId,
        name: parts[0] || 'Untitled',
        body: parts[1] || '',
        htmlBody: parts[2] || '',
        folder: parts[3] || '',
        createdAt: parts[4] || '',
        modifiedAt: parts[5] || '',
      });
    }

    return c.json({ notes: importedNotes });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

/**
 * POST /api/apple-notes/import-folder
 * Import all notes from a folder
 */
app.post('/import-folder', async (c) => {
  const body = await c.req.json();
  const folderId: string = body.folderId;

  if (!folderId) {
    return c.json({ error: 'folderId is required' }, 400);
  }

  try {
    const RS = String.fromCharCode(30);  // Record separator
    const US = String.fromCharCode(31);  // Unit separator

    // First get all note IDs in the folder
    const listScript = `
      tell application "Notes"
        set output to ""
        set targetFolder to first folder whose id is "${folderId}"
        set noteItems to notes of targetFolder
        set noteCount to count of noteItems
        repeat with i from 1 to noteCount
          set n to item i of noteItems
          set output to output & (id of n)
          if i < noteCount then
            set output to output & (ASCII character 31)
          end if
        end repeat
        return output
      end tell
    `;

    const idsResult = await runAppleScript(listScript);

    if (!idsResult) {
      return c.json({ notes: [] });
    }

    const noteIds = idsResult.split(US).filter(id => id.trim());

    // Import each note
    const importedNotes: NoteContent[] = [];

    for (const noteId of noteIds) {
      const script = `
        tell application "Notes"
          set n to first note whose id is "${noteId}"
          set noteName to name of n
          set noteBody to plaintext of n
          set noteHtml to body of n
          try
            set noteFolder to name of container of n
          on error
            set noteFolder to "Notes"
          end try
          set noteCreated to creation date of n as text
          set noteModified to modification date of n as text
          return noteName & (ASCII character 30) & noteBody & (ASCII character 30) & noteHtml & (ASCII character 30) & noteFolder & (ASCII character 30) & noteCreated & (ASCII character 30) & noteModified
        end tell
      `;

      const result = await runAppleScript(script);
      const parts = result.split(RS);

      importedNotes.push({
        id: noteId,
        name: parts[0] || 'Untitled',
        body: parts[1] || '',
        htmlBody: parts[2] || '',
        folder: parts[3] || '',
        createdAt: parts[4] || '',
        modifiedAt: parts[5] || '',
      });
    }

    return c.json({ notes: importedNotes });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

export default app;
