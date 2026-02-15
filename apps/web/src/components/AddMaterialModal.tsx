import { useState, useRef } from 'react';
import { getLLMService } from '../lib/llm';

interface AddMaterialModalProps {
  onClose: () => void;
  onAdd: (content: string, type: 'text' | 'image', note?: string) => void;
}

type InputMode = 'text' | 'image' | 'file';

interface ParsedFile {
  name: string;
  content: string;
  type: 'markdown' | 'text' | 'image';
}

export function AddMaterialModal({ onClose, onAdd }: AddMaterialModalProps) {
  const [mode, setMode] = useState<InputMode>('text');
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  // Handle image file for OCR
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setImagePreview(base64);
      await processImageOCR(base64, file.type);
    };
    reader.readAsDataURL(file);
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
          // Handle image files - read as base64 for OCR
          const base64 = await readFileAsDataURL(file);
          // For batch import, we'll process OCR later
          parsed.push({
            name: file.name,
            content: base64,
            type: 'image',
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

  // Parse markdown into sections (split by ## headers or --- dividers)
  const parseMarkdownSections = (content: string): string[] => {
    // Split by level-2 headers or horizontal rules
    const sections = content.split(/(?=^## )|(?=^---$)/m);
    return sections.filter(s => s.trim().length > 0);
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
    } else if (mode === 'image' && ocrResult) {
      onAdd(ocrResult, 'image', noteValue);
    } else if (mode === 'file' && parsedFiles.length > 0) {
      // Add all parsed files as materials
      parsedFiles.forEach((file) => {
        if (file.type === 'image') {
          // Skip images for now - need OCR processing
          // Could add batch OCR later
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
                className="w-full h-40 p-4 border border-gray-200 rounded-xl resize-none focus:outline-none focus:border-echo-text text-echo-text"
              />
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
                  Screenshots or photos with text (OCR)
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-40 object-cover rounded-xl"
                />
                {isProcessing ? (
                  <p className="text-echo-muted text-center">
                    Extracting text...
                  </p>
                ) : ocrResult ? (
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
                ) : null}
                <button
                  onClick={() => {
                    setImagePreview(null);
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
            (mode === 'image' && !ocrResult) ||
            (mode === 'file' && parsedFiles.filter(f => f.type !== 'image').length === 0)
          }
          className="w-full mt-6 bg-echo-text text-white py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
        >
          {mode === 'file' && parsedFiles.length > 1
            ? `Add All (${parsedFiles.filter(f => f.type !== 'image').length} items)`
            : 'Add to Library'}
        </button>
      </div>
    </div>
  );
}
