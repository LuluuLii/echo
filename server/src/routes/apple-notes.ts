import { Hono } from 'hono';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
 */
async function runAppleScript(script: string): Promise<string> {
  if (!isMacOS()) {
    throw new Error('Apple Notes import is only available on macOS');
  }

  try {
    const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`);
    return stdout.trim();
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
    const script = `
      tell application "Notes"
        set folderList to {}
        repeat with f in folders
          set folderName to name of f
          set noteCount to count of notes of f
          set folderId to id of f
          set end of folderList to folderId & "|||" & folderName & "|||" & noteCount
        end repeat
        return folderList as text
      end tell
    `;

    const result = await runAppleScript(script);

    if (!result) {
      return c.json({ folders: [] });
    }

    const folders: NoteFolder[] = result.split(', ').map(item => {
      const [id, name, count] = item.split('|||');
      return {
        id: id || '',
        name: name || 'Unknown',
        noteCount: parseInt(count) || 0,
      };
    }).filter(f => f.id);

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
    let script: string;

    if (folderId) {
      script = `
        tell application "Notes"
          set noteList to {}
          set targetFolder to first folder whose id is "${folderId}"
          repeat with n in notes of targetFolder
            set noteName to name of n
            set noteId to id of n
            set noteFolder to name of container of n
            set noteCreated to creation date of n as text
            set noteModified to modification date of n as text
            set noteBody to plaintext of n
            if length of noteBody > 100 then
              set noteSnippet to text 1 thru 100 of noteBody
            else
              set noteSnippet to noteBody
            end if
            set end of noteList to noteId & "|||" & noteName & "|||" & noteFolder & "|||" & noteCreated & "|||" & noteModified & "|||" & noteSnippet
          end repeat
          return noteList as text
        end tell
      `;
    } else {
      script = `
        tell application "Notes"
          set noteList to {}
          repeat with n in notes
            set noteName to name of n
            set noteId to id of n
            set noteFolder to name of container of n
            set noteCreated to creation date of n as text
            set noteModified to modification date of n as text
            set noteBody to plaintext of n
            if length of noteBody > 100 then
              set noteSnippet to text 1 thru 100 of noteBody
            else
              set noteSnippet to noteBody
            end if
            set end of noteList to noteId & "|||" & noteName & "|||" & noteFolder & "|||" & noteCreated & "|||" & noteModified & "|||" & noteSnippet
          end repeat
          return noteList as text
        end tell
      `;
    }

    const result = await runAppleScript(script);

    if (!result) {
      return c.json({ notes: [] });
    }

    const notes: NoteItem[] = result.split(', ').map(item => {
      const parts = item.split('|||');
      return {
        id: parts[0] || '',
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

    for (const noteId of noteIds) {
      const script = `
        tell application "Notes"
          set n to first note whose id is "${noteId}"
          set noteName to name of n
          set noteBody to plaintext of n
          set noteHtml to body of n
          set noteFolder to name of container of n
          set noteCreated to creation date of n as text
          set noteModified to modification date of n as text
          return noteName & "|||SPLIT|||" & noteBody & "|||SPLIT|||" & noteHtml & "|||SPLIT|||" & noteFolder & "|||SPLIT|||" & noteCreated & "|||SPLIT|||" & noteModified
        end tell
      `;

      const result = await runAppleScript(script);
      const parts = result.split('|||SPLIT|||');

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
    // First get all note IDs in the folder
    const listScript = `
      tell application "Notes"
        set noteIds to {}
        set targetFolder to first folder whose id is "${folderId}"
        repeat with n in notes of targetFolder
          set end of noteIds to id of n
        end repeat
        return noteIds as text
      end tell
    `;

    const idsResult = await runAppleScript(listScript);

    if (!idsResult) {
      return c.json({ notes: [] });
    }

    const noteIds = idsResult.split(', ').filter(id => id.trim());

    // Import each note
    const importedNotes: NoteContent[] = [];

    for (const noteId of noteIds) {
      const script = `
        tell application "Notes"
          set n to first note whose id is "${noteId}"
          set noteName to name of n
          set noteBody to plaintext of n
          set noteHtml to body of n
          set noteFolder to name of container of n
          set noteCreated to creation date of n as text
          set noteModified to modification date of n as text
          return noteName & "|||SPLIT|||" & noteBody & "|||SPLIT|||" & noteHtml & "|||SPLIT|||" & noteFolder & "|||SPLIT|||" & noteCreated & "|||SPLIT|||" & noteModified
        end tell
      `;

      const result = await runAppleScript(script);
      const parts = result.split('|||SPLIT|||');

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
