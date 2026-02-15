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
 * Uses BULK fetch (id of every folder, name of every folder) for speed
 */
app.get('/folders', async (c) => {
  try {
    // FAST: Bulk property access for folders
    const script = `
      tell application "Notes"
        set folderIds to id of every folder
        set folderNames to name of every folder

        -- Build ID list
        set idList to ""
        repeat with i from 1 to count of folderIds
          if i > 1 then set idList to idList & (ASCII character 30)
          set idList to idList & (item i of folderIds)
        end repeat

        -- Build name list
        set nameList to ""
        repeat with i from 1 to count of folderNames
          if i > 1 then set nameList to nameList & (ASCII character 30)
          set nameList to nameList & (item i of folderNames)
        end repeat

        -- Build count list (must loop for this)
        set countList to ""
        repeat with i from 1 to count of folderIds
          if i > 1 then set countList to countList & (ASCII character 30)
          set countList to countList & (count of notes of folder i)
        end repeat

        return idList & (ASCII character 31) & nameList & (ASCII character 31) & countList
      end tell
    `;

    const result = await runAppleScript(script);

    if (!result) {
      return c.json({ folders: [] });
    }

    const US = String.fromCharCode(31);
    const RS = String.fromCharCode(30);
    const parts = result.split(US);
    const ids = (parts[0] || '').split(RS).filter(Boolean);
    const names = (parts[1] || '').split(RS).filter(Boolean);
    const counts = (parts[2] || '').split(RS).filter(Boolean);

    const folders: NoteFolder[] = ids.map((id, i) => ({
      id: id.replace(/^"|"$/g, ''),
      name: names[i] || 'Unknown',
      noteCount: parseInt(counts[i]) || 0,
    })).filter(f => f.id && f.name !== 'Recently Deleted');

    return c.json({ folders });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

/**
 * GET /api/apple-notes/notes?folder=<folderId>&offset=0&limit=50
 * List notes in a folder with pagination
 * Uses BULK fetch (id of every note, name of every note) which is 100x faster than looping
 */
app.get('/notes', async (c) => {
  const folderId = c.req.query('folder');
  const offset = parseInt(c.req.query('offset') || '0', 10);
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 200);

  if (!folderId) {
    return c.json({ error: 'folder parameter is required' }, 400);
  }

  try {
    // FAST: Get all IDs and names in bulk (two separate calls, each ~0.5s)
    const script = `
      tell application "Notes"
        set targetFolder to first folder whose id is "${folderId}"
        set folderName to name of targetFolder
        set noteIds to id of every note of targetFolder
        set noteNames to name of every note of targetFolder
        -- Return as: folderName|||id1,id2,id3|||name1,name2,name3
        set idList to ""
        repeat with i from 1 to count of noteIds
          if i > 1 then set idList to idList & (ASCII character 30)
          set idList to idList & (item i of noteIds)
        end repeat
        set nameList to ""
        repeat with i from 1 to count of noteNames
          if i > 1 then set nameList to nameList & (ASCII character 30)
          set nameList to nameList & (item i of noteNames)
        end repeat
        return folderName & (ASCII character 31) & idList & (ASCII character 31) & nameList
      end tell
    `;

    const result = await runAppleScript(script);

    if (!result) {
      return c.json({ notes: [], total: 0, hasMore: false });
    }

    const US = String.fromCharCode(31);
    const RS = String.fromCharCode(30);
    const parts = result.split(US);
    const folderName = (parts[0] || '').replace(/^"|"$/g, '');
    const ids = (parts[1] || '').split(RS).filter(Boolean);
    const names = (parts[2] || '').split(RS).filter(Boolean);

    const total = ids.length;
    const paginatedIds = ids.slice(offset, offset + limit);
    const paginatedNames = names.slice(offset, offset + limit);

    const notes: NoteItem[] = paginatedIds.map((id, i) => ({
      id: id.replace(/^"|"$/g, ''),
      name: paginatedNames[i] || 'Untitled',
      folder: folderName,
      createdAt: '',
      modifiedAt: '',
      snippet: '',
    }));

    return c.json({
      notes,
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

/**
 * POST /api/apple-notes/import
 * Import selected notes by their IDs
 * Uses batch processing to reduce AppleScript call overhead
 */
app.post('/import', async (c) => {
  const body = await c.req.json();
  const noteIds: string[] = body.noteIds;

  if (!noteIds || !Array.isArray(noteIds) || noteIds.length === 0) {
    return c.json({ error: 'noteIds array is required' }, 400);
  }

  try {
    const importedNotes: NoteContent[] = [];
    const RS = String.fromCharCode(30);  // Record separator (within note)
    const US = String.fromCharCode(31);  // Unit separator (between notes)
    const BATCH_SIZE = 5;  // Process 5 notes per AppleScript call

    // Process notes in batches
    for (let i = 0; i < noteIds.length; i += BATCH_SIZE) {
      const batchIds = noteIds.slice(i, i + BATCH_SIZE);

      // Build AppleScript that fetches multiple notes at once
      const idListScript = batchIds.map(id => `"${id}"`).join(', ');

      const script = `
        tell application "Notes"
          set noteIdList to {${idListScript}}
          set output to ""
          set noteIndex to 0

          repeat with noteId in noteIdList
            set noteIndex to noteIndex + 1
            set n to first note whose id is noteId

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

            set noteData to noteId & (ASCII character 30) & noteName & (ASCII character 30) & noteBody & (ASCII character 30) & noteHtml & (ASCII character 30) & noteFolder & (ASCII character 30) & noteCreated & (ASCII character 30) & noteModified

            if noteIndex > 1 then
              set output to output & (ASCII character 31)
            end if
            set output to output & noteData
          end repeat

          return output
        end tell
      `;

      const result = await runAppleScript(script);
      const notesData = result.split(US);

      for (const noteData of notesData) {
        const parts = noteData.split(RS);
        if (parts.length >= 7) {
          importedNotes.push({
            id: (parts[0] || '').replace(/^"|"$/g, ''),
            name: parts[1] || 'Untitled',
            body: parts[2] || '',
            htmlBody: parts[3] || '',
            folder: parts[4] || '',
            createdAt: parts[5] || '',
            modifiedAt: parts[6] || '',
          });
        }
      }
    }

    return c.json({ notes: importedNotes });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

/**
 * POST /api/apple-notes/import-folder
 * Import all notes from a folder
 * Uses batch processing for better performance
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

    // First get all note IDs in the folder using bulk fetch
    const listScript = `
      tell application "Notes"
        set targetFolder to first folder whose id is "${folderId}"
        set noteIds to id of every note of targetFolder
        set idList to ""
        repeat with i from 1 to count of noteIds
          if i > 1 then set idList to idList & (ASCII character 31)
          set idList to idList & (item i of noteIds)
        end repeat
        return idList
      end tell
    `;

    const idsResult = await runAppleScript(listScript);

    if (!idsResult) {
      return c.json({ notes: [] });
    }

    const noteIds = idsResult.split(US).filter(id => id.trim()).map(id => id.replace(/^"|"$/g, ''));
    const importedNotes: NoteContent[] = [];
    const BATCH_SIZE = 5;

    // Process notes in batches
    for (let i = 0; i < noteIds.length; i += BATCH_SIZE) {
      const batchIds = noteIds.slice(i, i + BATCH_SIZE);
      const idListScript = batchIds.map(id => `"${id}"`).join(', ');

      const script = `
        tell application "Notes"
          set noteIdList to {${idListScript}}
          set output to ""
          set noteIndex to 0

          repeat with noteId in noteIdList
            set noteIndex to noteIndex + 1
            set n to first note whose id is noteId

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

            set noteData to noteId & (ASCII character 30) & noteName & (ASCII character 30) & noteBody & (ASCII character 30) & noteHtml & (ASCII character 30) & noteFolder & (ASCII character 30) & noteCreated & (ASCII character 30) & noteModified

            if noteIndex > 1 then
              set output to output & (ASCII character 31)
            end if
            set output to output & noteData
          end repeat

          return output
        end tell
      `;

      const result = await runAppleScript(script);
      const notesData = result.split(US);

      for (const noteData of notesData) {
        const parts = noteData.split(RS);
        if (parts.length >= 7) {
          importedNotes.push({
            id: (parts[0] || '').replace(/^"|"$/g, ''),
            name: parts[1] || 'Untitled',
            body: parts[2] || '',
            htmlBody: parts[3] || '',
            folder: parts[4] || '',
            createdAt: parts[5] || '',
            modifiedAt: parts[6] || '',
          });
        }
      }
    }

    return c.json({ notes: importedNotes });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

export default app;
