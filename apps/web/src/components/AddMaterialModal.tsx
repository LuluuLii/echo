import { useState, useRef } from 'react';

interface AddMaterialModalProps {
  onClose: () => void;
  onAdd: (content: string, type: 'text' | 'image', note?: string) => void;
}

export function AddMaterialModal({ onClose, onAdd }: AddMaterialModalProps) {
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setImagePreview(base64);

      // Call OCR API
      setIsProcessing(true);
      try {
        const response = await fetch('http://localhost:3000/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64.split(',')[1],
            mimeType: file.type,
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
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    const noteValue = note.trim() || undefined;
    if (mode === 'text' && text.trim()) {
      onAdd(text.trim(), 'text', noteValue);
    } else if (mode === 'image' && ocrResult) {
      onAdd(ocrResult, 'image', noteValue);
    }
  };

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
            Image (OCR)
          </button>
        </div>

        {mode === 'text' ? (
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
        ) : (
          <div className="space-y-4">
            {!imagePreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-gray-300 transition-colors"
              >
                <p className="text-echo-muted mb-2">Click to select an image</p>
                <p className="text-echo-hint text-sm">
                  Screenshots or photos with text
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
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={mode === 'text' ? !text.trim() : !ocrResult}
          className="w-full mt-6 bg-echo-text text-white py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
        >
          Add to Library
        </button>
      </div>
    </div>
  );
}
