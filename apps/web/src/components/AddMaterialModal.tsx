import { useState, useRef, useEffect } from 'react';
import { getLLMService } from '../lib/llm';
import { checkDuplicate, smartSegment, type DuplicateCheckResult } from '../lib/deduplication';
import { useMaterialsStore } from '../lib/store/materials';

interface AddMaterialModalProps {
  onClose: () => void;
  onAdd: (content: string, type: 'text' | 'file', note?: string, fileOptions?: {
    fileName?: string;
    fileType?: 'image' | 'pdf' | 'document';
    mimeType?: string;
    fileData?: string;
    fileThumbnail?: string;
  }) => void;
}

type InputMode = 'text' | 'image' | 'file';
type ImageAction = 'extract' | 'keep' | null;

interface ParsedFile {
  name: string;
  content: string;
  type: 'markdown' | 'text' | 'image';
  base64?: string;      // Original base64 data for images
  mimeType?: string;    // MIME type for images
}

export function AddMaterialModal({ onClose, onAdd }: AddMaterialModalProps) {
  const { materials } = useMaterialsStore();
  const [mode, setMode] = useState<InputMode>('text');
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  // Image action choice: 'extract' (OCR) or 'keep' (save as file)
  const [imageAction, setImageAction] = useState<ImageAction>(null);

  // Duplicate detection state
  const [duplicateResult, setDuplicateResult] = useState<DuplicateCheckResult | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const duplicateCheckTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check for duplicates when text changes (debounced)
  useEffect(() => {
    if (mode !== 'text' || !text.trim() || text.length < 20) {
      setDuplicateResult(null);
      return;
    }

    // Debounce the check
    if (duplicateCheckTimeout.current) {
      clearTimeout(duplicateCheckTimeout.current);
    }

    duplicateCheckTimeout.current = setTimeout(async () => {
      setIsCheckingDuplicate(true);
      try {
        const result = await checkDuplicate(text.trim(), materials);
        setDuplicateResult(result);
      } catch (error) {
        console.error('Duplicate check failed:', error);
      } finally {
        setIsCheckingDuplicate(false);
      }
    }, 500);

    return () => {
      if (duplicateCheckTimeout.current) {
        clearTimeout(duplicateCheckTimeout.current);
      }
    };
  }, [text, mode, materials]);

  // Handle image file selection (no auto-OCR, let user choose)
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setImagePreview(base64);
      setImageMimeType(file.type);
      setImageFileName(file.name);
      setImageAction(null);  // Reset action - user must choose
      setOcrResult(null);    // Clear any previous OCR result
    };
    reader.readAsDataURL(file);
  };

  // Handle user choosing to extract text (OCR)
  const handleExtractText = async () => {
    if (!imagePreview || !imageMimeType) return;
    setImageAction('extract');
    await processImageOCR(imagePreview, imageMimeType);
  };

  // Handle user choosing to keep image
  const handleKeepImage = () => {
    setImageAction('keep');
  };

  // Process image with OCR (local LLM or API)
  const processImageOCR = async (base64: string, mimeType: string) => {
    setIsProcessing(true);
    try {
      // Try local LLM first if available
      const llmService = getLLMService();
      await llmService.waitForInit();
      const activeProvider = llmService.getActiveProvider();

      // Note: activeProvider check for future local OCR support
      void activeProvider;
      // For now, fall back to server API for OCR (vision models needed)
      const response = await fetch('http://localhost:3000/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64.split(',')[1],
          mimeType,
        }),
      });
      const data = await response.json();
      setOcrResult(data.text);
    } catch (error) {
      console.error('OCR failed:', error);
      setOcrResult('Failed to extract text. Please enter manually.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle document files (markdown, txt)
  const handleDocumentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const parsed: ParsedFile[] = [];

    for (const file of Array.from(files)) {
      try {
        if (file.type.startsWith('image/')) {
          // Handle image files - save as file materials
          const base64 = await readFileAsDataURL(file);
          parsed.push({
            name: file.name,
            content: file.name, // Use filename as description
            type: 'image',
            base64: base64,
            mimeType: file.type,
          });
        } else {
          // Handle text/markdown files
          const content = await readFileAsText(file);
          const fileType = file.name.endsWith('.md') ? 'markdown' : 'text';

          // For markdown, we might want to split by sections or paragraphs
          if (fileType === 'markdown') {
            const sections = parseMarkdownSections(content);
            sections.forEach((section, i) => {
              if (section.trim()) {
                parsed.push({
                  name: sections.length > 1 ? `${file.name} (${i + 1})` : file.name,
                  content: section.trim(),
                  type: 'markdown',
                });
              }
            });
          } else {
            parsed.push({
              name: file.name,
              content: content.trim(),
              type: 'text',
            });
          }
        }
      } catch (error) {
        console.error(`Failed to parse ${file.name}:`, error);
      }
    }

    setParsedFiles(parsed);
    setSelectedFileIndex(0);
    setIsProcessing(false);
  };

  // Parse markdown into sections using smart segmentation
  const parseMarkdownSections = (content: string): string[] => {
    return smartSegment(content);
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = () => {
    const noteValue = note.trim() || undefined;
    if (mode === 'text' && text.trim()) {
      onAdd(text.trim(), 'text', noteValue);
    } else if (mode === 'image' && imageAction === 'extract' && ocrResult) {
      // Extract text mode: save as text material
      onAdd(ocrResult, 'text', noteValue);
    } else if (mode === 'image' && imageAction === 'keep' && imagePreview) {
      // Keep image mode: save as file material
      const description = noteValue || imageFileName || 'Image';
      onAdd(description, 'file', undefined, {
        fileName: imageFileName || 'image',
        fileType: 'image',
        mimeType: imageMimeType || 'image/png',
        fileData: imagePreview,
      });
    } else if (mode === 'file' && parsedFiles.length > 0) {
      // Add all parsed files as materials
      parsedFiles.forEach((file) => {
        if (file.type === 'image' && file.base64) {
          // Save image as file
          onAdd(file.name, 'file', undefined, {
            fileName: file.name,
            fileType: 'image',
            mimeType: file.mimeType || 'image/png',
            fileData: file.base64,
          });
        } else {
          onAdd(file.content, 'text', `Imported from: ${file.name}`);
        }
      });
    }
  };

  const handleAddSingleFile = (index: number) => {
    const file = parsedFiles[index];
    if (file && file.type !== 'image') {
      onAdd(file.content, 'text', `Imported from: ${file.name}`);
      // Remove from list
      setParsedFiles(prev => prev.filter((_, i) => i !== index));
    }
  };

  const currentFile = parsedFiles[selectedFileIndex];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-echo-text">Add Material</h2>
          <button
            onClick={onClose}
            className="text-echo-hint hover:text-echo-muted"
          >
            Cancel
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('text')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'text'
                ? 'bg-echo-text text-white'
                : 'bg-gray-100 text-echo-muted hover:bg-gray-200'
            }`}
          >
            Text
          </button>
          <button
            onClick={() => setMode('image')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'image'
                ? 'bg-echo-text text-white'
                : 'bg-gray-100 text-echo-muted hover:bg-gray-200'
            }`}
          >
            Image
          </button>
          <button
            onClick={() => setMode('file')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'file'
                ? 'bg-echo-text text-white'
                : 'bg-gray-100 text-echo-muted hover:bg-gray-200'
            }`}
          >
            Import File
          </button>
        </div>

        {/* Text mode */}
        {mode === 'text' && (
          <div className="space-y-4">
            <div>
              <label className="block text-echo-muted text-sm mb-2">
                Content
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write your thought, observation, or feeling..."
                className={`w-full h-40 p-4 border rounded-xl resize-none focus:outline-none text-echo-text ${
                  duplicateResult?.isDuplicate
                    ? 'border-yellow-400 focus:border-yellow-500'
                    : duplicateResult?.isNearDuplicate
                    ? 'border-orange-300 focus:border-orange-400'
                    : 'border-gray-200 focus:border-echo-text'
                }`}
              />
              {/* Duplicate warning */}
              {isCheckingDuplicate && (
                <p className="text-xs text-echo-hint mt-1">Checking for duplicates...</p>
              )}
              {duplicateResult?.isDuplicate && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-700 font-medium">Exact duplicate found</p>
                  <p className="text-xs text-yellow-600 mt-1 line-clamp-2">
                    "{duplicateResult.matches[0]?.content.slice(0, 100)}..."
                  </p>
                </div>
              )}
              {duplicateResult?.isNearDuplicate && !duplicateResult.isDuplicate && (
                <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-700 font-medium">
                    Similar content exists ({Math.round((duplicateResult.matches[0]?.similarity || 0) * 100)}% match)
                  </p>
                  <p className="text-xs text-orange-600 mt-1 line-clamp-2">
                    "{duplicateResult.matches[0]?.content.slice(0, 100)}..."
                  </p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-echo-muted text-sm mb-2">
                Personal Note (optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Context or reminder for yourself..."
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-echo-text text-echo-text"
              />
            </div>
          </div>
        )}

        {/* Image mode */}
        {mode === 'image' && (
          <div className="space-y-4">
            {!imagePreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-gray-300 transition-colors"
              >
                <p className="text-echo-muted mb-2">Click to select an image</p>
                <p className="text-echo-hint text-sm">
                  Screenshots, photos, or any image
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-40 object-cover rounded-xl"
                />

                {/* Action choice - only show if not yet chosen */}
                {!imageAction && !isProcessing && (
                  <div className="flex gap-3">
                    <button
                      onClick={handleExtractText}
                      className="flex-1 py-3 px-4 bg-blue-50 text-blue-700 rounded-xl font-medium hover:bg-blue-100 transition-colors text-sm"
                    >
                      <span className="block text-base mb-1">Extract Text</span>
                      <span className="text-xs text-blue-500">Use OCR to extract text from image</span>
                    </button>
                    <button
                      onClick={handleKeepImage}
                      className="flex-1 py-3 px-4 bg-green-50 text-green-700 rounded-xl font-medium hover:bg-green-100 transition-colors text-sm"
                    >
                      <span className="block text-base mb-1">Keep Image</span>
                      <span className="text-xs text-green-500">Save original image as file</span>
                    </button>
                  </div>
                )}

                {/* Processing state */}
                {isProcessing && (
                  <p className="text-echo-muted text-center py-4">
                    Extracting text...
                  </p>
                )}

                {/* Extract text result */}
                {imageAction === 'extract' && ocrResult && (
                  <div>
                    <label className="block text-echo-muted text-sm mb-2">
                      Extracted Text (editable)
                    </label>
                    <textarea
                      value={ocrResult}
                      onChange={(e) => setOcrResult(e.target.value)}
                      className="w-full h-32 p-4 border border-gray-200 rounded-xl resize-none focus:outline-none focus:border-echo-text text-echo-text text-sm"
                    />
                  </div>
                )}

                {/* Keep image - show note field */}
                {imageAction === 'keep' && (
                  <div className="p-3 bg-green-50 rounded-xl">
                    <p className="text-green-700 text-sm font-medium mb-2">
                      Image will be saved to Files
                    </p>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Add a description (optional)..."
                      className="w-full p-2 border border-green-200 rounded-lg text-sm focus:outline-none focus:border-green-400"
                    />
                  </div>
                )}

                <button
                  onClick={() => {
                    setImagePreview(null);
                    setImageMimeType(null);
                    setImageFileName(null);
                    setImageAction(null);
                    setOcrResult(null);
                  }}
                  className="text-echo-hint text-sm hover:text-echo-muted"
                >
                  Choose different image
                </button>
              </div>
            )}
            <div>
              <label className="block text-echo-muted text-sm mb-2">
                Personal Note (optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Context or reminder for yourself..."
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-echo-text text-echo-text"
              />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>
        )}

        {/* File import mode */}
        {mode === 'file' && (
          <div className="space-y-4">
            {parsedFiles.length === 0 ? (
              <div
                onClick={() => documentInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-gray-300 transition-colors"
              >
                {isProcessing ? (
                  <p className="text-echo-muted">Processing files...</p>
                ) : (
                  <>
                    <p className="text-echo-muted mb-2">Click to select files</p>
                    <p className="text-echo-hint text-sm">
                      Supports: .md, .txt, images
                    </p>
                    <p className="text-echo-hint text-xs mt-2">
                      Markdown files will be split by sections
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-echo-muted text-sm">
                    {parsedFiles.length} item{parsedFiles.length > 1 ? 's' : ''} found
                  </p>
                  <button
                    onClick={() => setParsedFiles([])}
                    className="text-echo-hint text-sm hover:text-echo-muted"
                  >
                    Clear all
                  </button>
                </div>

                {/* File list */}
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {parsedFiles.map((file, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedFileIndex === index
                          ? 'border-echo-text bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedFileIndex(index)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-echo-hint">
                            {file.type}
                          </span>
                          <span className="text-sm text-echo-text truncate max-w-[200px]">
                            {file.name}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddSingleFile(index);
                          }}
                          className="text-xs text-blue-500 hover:text-blue-600"
                        >
                          Add
                        </button>
                      </div>
                      <p className="text-xs text-echo-muted mt-1 line-clamp-2">
                        {file.content.slice(0, 100)}...
                      </p>
                    </div>
                  ))}
                </div>

                {/* Preview selected */}
                {currentFile && currentFile.type !== 'image' && (
                  <div className="border-t pt-3">
                    <label className="block text-echo-muted text-sm mb-2">
                      Preview: {currentFile.name}
                    </label>
                    <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                      <p className="text-sm text-echo-text whitespace-pre-wrap">
                        {currentFile.content}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            <input
              ref={documentInputRef}
              type="file"
              accept=".md,.txt,.markdown,text/plain,text/markdown,image/*"
              multiple
              onChange={handleDocumentSelect}
              className="hidden"
            />
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={
            (mode === 'text' && !text.trim()) ||
            (mode === 'image' && !imageAction) ||
            (mode === 'image' && imageAction === 'extract' && !ocrResult) ||
            (mode === 'image' && imageAction === 'keep' && !imagePreview) ||
            (mode === 'file' && parsedFiles.length === 0)
          }
          className={`w-full mt-6 py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
            duplicateResult?.isDuplicate
              ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
              : imageAction === 'keep'
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-echo-text hover:bg-gray-700 text-white'
          }`}
        >
          {mode === 'file' && parsedFiles.length > 1
            ? `Add All (${parsedFiles.length} items)`
            : mode === 'image' && imageAction === 'keep'
            ? 'Save to Files'
            : duplicateResult?.isDuplicate
            ? 'Add Anyway (Duplicate)'
            : 'Add to Library'}
        </button>
      </div>
    </div>
  );
}
