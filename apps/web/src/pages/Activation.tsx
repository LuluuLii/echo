import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMaterialsStore } from '../lib/store/materials';
import { generateActivationCard } from '../lib/activation-templates';
import { AddMaterialModal } from '../components/AddMaterialModal';
import { AppleNotesImporter } from '../components/AppleNotesImporter';
import { getICloudStatus, connectToICloud } from '../lib/icloud';
import { refreshICloudStatus } from '../lib/loro';

export function Activation() {
  const navigate = useNavigate();
  const { currentCard, materials, setCurrentCard, loadDailyCard, addMaterial, setMaterialTranslation } = useMaterialsStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAppleNotesImporter, setShowAppleNotesImporter] = useState(false);
  const [iCloudStatus, setICloudStatus] = useState<{ connected: boolean; hasPermission: boolean } | null>(null);
  const [isConnectingICloud, setIsConnectingICloud] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [expandedMaterialId, setExpandedMaterialId] = useState<string | null>(null);

  // Ref to prevent duplicate generation (React StrictMode renders twice)
  const generationStartedRef = useRef(false);

  // Check iCloud status on mount
  useEffect(() => {
    getICloudStatus().then(setICloudStatus);
  }, []);

  // Handle iCloud connection
  const handleConnectICloud = async () => {
    setIsConnectingICloud(true);
    try {
      const result = await connectToICloud();
      if (result.success) {
        await refreshICloudStatus();
        setICloudStatus({ connected: true, hasPermission: true });
      }
    } finally {
      setIsConnectingICloud(false);
    }
  };

  // Handle Apple Notes import
  const handleAppleNotesImport = async (notes: { id: string; name: string; body: string; folder: string }[]) => {
    setShowAppleNotesImporter(false);
    setIsImporting(true);

    // Add all notes as materials
    for (const note of notes) {
      if (note.body.trim()) {
        addMaterial(note.body.trim(), 'text', `Imported from Apple Notes: ${note.folder}/${note.name}`);
      }
    }

    // Small delay to let state update
    await new Promise(resolve => setTimeout(resolve, 100));
    setIsImporting(false);

    // Trigger card generation if no card exists
    if (!currentCard) {
      generateCardFromMaterials();
    }
  };

  // Generate card from current materials
  const generateCardFromMaterials = async () => {
    // Get fresh materials from store
    const currentMaterials = useMaterialsStore.getState().materials;
    if (currentMaterials.length === 0) return;

    setIsGenerating(true);
    generationStartedRef.current = true;

    const shuffled = [...currentMaterials].sort(() => Math.random() - 0.5);
    const selectedCount = Math.min(Math.max(2, Math.floor(Math.random() * 3) + 2), currentMaterials.length);
    const selectedMaterials = shuffled.slice(0, selectedCount);

    try {
      const card = await generateActivationCard(
        selectedMaterials.map((m) => ({
          id: m.id,
          content: m.content,
          contentEn: m.contentEn,
          note: m.note,
        })),
        undefined,
        setMaterialTranslation
      );
      setCurrentCard(card);
    } catch (error) {
      console.error('Failed to generate activation card:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Load daily card or generate new one on mount
  useEffect(() => {
    // Skip if generation already started or in progress
    if (generationStartedRef.current || isGenerating) {
      return;
    }

    // First, try to load today's card from storage
    const existingCard = loadDailyCard();
    if (existingCard) {
      // Already have today's card, no need to generate
      return;
    }

    // No materials, nothing to generate
    if (materials.length === 0) {
      return;
    }

    generationStartedRef.current = true;
    setIsGenerating(true);

    // Select random 2-4 materials for daily activation
    const shuffled = [...materials].sort(() => Math.random() - 0.5);
    const selectedCount = Math.min(Math.max(2, Math.floor(Math.random() * 3) + 2), materials.length);
    const selectedMaterials = shuffled.slice(0, selectedCount);

    generateActivationCard(
      selectedMaterials.map((m) => ({
        id: m.id,
        content: m.content,
        contentEn: m.contentEn,
        note: m.note,
      })),
      undefined,
      setMaterialTranslation
    )
      .then((card) => {
        setCurrentCard(card);
      })
      .catch((error) => {
        console.error('Failed to generate activation card:', error);
      })
      .finally(() => {
        setIsGenerating(false);
      });
    // Note: Empty deps - only run once on mount. generationStartedRef prevents StrictMode double-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Use current card from store (persisted daily card)
  const card = currentCard;

  // Get source materials for this card
  const sourceMaterials = card
    ? materials.filter((m) => card.materialIds.includes(m.id))
    : [];

  const handleStartEcho = () => {
    if (card) {
      navigate('/session');
    }
  };

  const handleAddMaterial = (
    content: string,
    type: 'text' | 'file',
    note?: string,
    fileOptions?: {
      fileName?: string;
      fileType?: 'image' | 'pdf' | 'document';
      mimeType?: string;
      fileData?: string;
      fileThumbnail?: string;
    }
  ) => {
    addMaterial(content, type, note, fileOptions);
    setShowAddModal(false);
  };

  const handleRegenerate = async () => {
    if (materials.length === 0) return;

    setIsGenerating(true);

    // Select random 2-4 materials
    const shuffled = [...materials].sort(() => Math.random() - 0.5);
    const selectedCount = Math.min(Math.max(2, Math.floor(Math.random() * 3) + 2), materials.length);
    const selectedMaterials = shuffled.slice(0, selectedCount);

    try {
      const newCard = await generateActivationCard(
        selectedMaterials.map((m) => ({
          id: m.id,
          content: m.content,
          contentEn: m.contentEn,
          note: m.note,
        })),
        undefined,
        setMaterialTranslation
      );
      // This will persist the new card as today's card
      setCurrentCard(newCard);
    } catch (error) {
      console.error('Failed to regenerate card:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Loading state
  if (isGenerating || isImporting) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-50 text-center">
          <div className="w-8 h-8 border-2 border-echo-text border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-echo-muted">
            {isImporting ? 'Importing your notes...' : 'Generating your activation card...'}
          </p>
        </div>
      </div>
    );
  }

  // Empty state - no materials
  if (materials.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        {/* iCloud Setup Banner */}
        {iCloudStatus && !iCloudStatus.connected && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4 max-w-xl w-full">
            <div className="flex items-start gap-3">
              <span className="text-2xl">☁️</span>
              <div className="flex-1">
                <h3 className="font-medium text-blue-900">Enable iCloud Sync</h3>
                <p className="text-blue-700 text-sm mt-1">
                  Keep your data safe and synced across devices. Your data will be stored in your own iCloud Drive.
                </p>
                <button
                  onClick={handleConnectICloud}
                  disabled={isConnectingICloud}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isConnectingICloud ? 'Connecting...' : 'Connect iCloud Drive'}
                </button>
              </div>
              <button
                onClick={() => setICloudStatus(null)}
                className="text-blue-400 hover:text-blue-600"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-50 text-center max-w-xl w-full">
          <h2 className="text-xl font-semibold text-echo-text mb-2">
            Ready to express yourself?
          </h2>
          <p className="text-echo-muted mb-6">
            Add your first material to start receiving personalized activation cards.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-echo-text text-white rounded-xl font-medium hover:bg-gray-700 transition-colors"
          >
            + Add Your First Material
          </button>
        </div>

        {showAddModal && (
          <AddMaterialModal
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddMaterial}
            onOpenAppleNotes={() => {
              setShowAddModal(false);
              setShowAppleNotesImporter(true);
            }}
          />
        )}

        {showAppleNotesImporter && (
          <AppleNotesImporter
            onClose={() => setShowAppleNotesImporter(false)}
            onImport={handleAppleNotesImport}
          />
        )}
      </div>
    );
  }

  // No card generated yet - show prompt to generate
  if (!card) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        {/* iCloud Setup Banner */}
        {iCloudStatus && !iCloudStatus.connected && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4 max-w-xl w-full">
            <div className="flex items-start gap-3">
              <span className="text-2xl">☁️</span>
              <div className="flex-1">
                <h3 className="font-medium text-blue-900">Enable iCloud Sync</h3>
                <p className="text-blue-700 text-sm mt-1">
                  Keep your data safe and synced across devices.
                </p>
                <button
                  onClick={handleConnectICloud}
                  disabled={isConnectingICloud}
                  className="mt-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isConnectingICloud ? 'Connecting...' : 'Connect iCloud'}
                </button>
              </div>
              <button
                onClick={() => setICloudStatus(null)}
                className="text-blue-400 hover:text-blue-600"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-50 text-center max-w-xl w-full">
          <h2 className="text-xl font-semibold text-echo-text mb-2">
            You have {materials.length} material{materials.length > 1 ? 's' : ''}
          </h2>
          <p className="text-echo-muted mb-6">
            Generate an activation card to start practicing.
          </p>
          <button
            onClick={generateCardFromMaterials}
            className="px-6 py-3 bg-echo-text text-white rounded-xl font-medium hover:bg-gray-700 transition-colors"
          >
            Generate Activation Card
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* iCloud Setup Banner */}
      {iCloudStatus && !iCloudStatus.connected && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4 flex-shrink-0">
          <div className="flex items-start gap-3">
            <span className="text-2xl">☁️</span>
            <div className="flex-1">
              <h3 className="font-medium text-blue-900">Enable iCloud Sync</h3>
              <p className="text-blue-700 text-sm mt-1">
                Keep your data safe and synced across devices.
              </p>
              <button
                onClick={handleConnectICloud}
                disabled={isConnectingICloud}
                className="mt-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isConnectingICloud ? 'Connecting...' : 'Connect iCloud'}
              </button>
            </div>
            <button
              onClick={() => setICloudStatus(null)}
              className="text-blue-400 hover:text-blue-600"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Two-column layout: Card on left, Materials on right */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left: Activation Card */}
        <div className="flex-1 min-w-0 bg-white rounded-2xl shadow-sm border border-gray-50 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-8">
            {/* Emotional Anchor */}
            <p className="text-echo-muted italic text-sm mb-6 leading-relaxed">
              {card.emotionalAnchor}
            </p>

            {/* Lived Experience */}
            <div className="border-l-2 border-echo-text bg-gray-50 p-4 mb-8">
              <p className="text-echo-text italic leading-relaxed">
                {card.livedExperience}
              </p>
            </div>

            {/* Expressions */}
            <div className="mb-8">
              <p className="text-echo-hint text-xs uppercase tracking-wide mb-3">
                Expressions to carry the feeling:
              </p>
              <div className="space-y-2">
                {card.expressions.map((expr, index) => (
                  <p key={index} className="text-echo-muted text-sm">
                    "{expr}"
                  </p>
                ))}
              </div>
            </div>

            {/* Invitation */}
            <p className="text-echo-text leading-relaxed">
              {card.invitation}
            </p>
          </div>

          {/* CTA - fixed at bottom */}
          <div className="p-6 pt-0 flex-shrink-0">
            <button
              onClick={handleStartEcho}
              className="w-full bg-echo-text text-white py-4 rounded-xl font-medium hover:bg-gray-700 transition-colors"
            >
              Start Echo
            </button>
          </div>
        </div>

        {/* Right: Source Materials */}
        {sourceMaterials.length > 0 && (
          <div className="w-96 flex-shrink-0 bg-white rounded-2xl shadow-sm border border-gray-50 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex-shrink-0">
              <p className="text-echo-hint text-xs uppercase tracking-wide">
                Generated from {sourceMaterials.length} material{sourceMaterials.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {sourceMaterials.map((material) => (
                <div
                  key={material.id}
                  onClick={() => setExpandedMaterialId(material.id)}
                  className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  {/* Truncated content - max 4 lines */}
                  <p className="text-echo-text text-sm leading-relaxed line-clamp-4">
                    {material.content}
                  </p>
                  {material.content.length > 150 && (
                    <p className="text-echo-hint text-xs mt-1">Click to view full content</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expanded Material Modal */}
        {expandedMaterialId && (() => {
          const material = sourceMaterials.find(m => m.id === expandedMaterialId);
          if (!material) return null;
          return (
            <div
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8"
              onClick={() => setExpandedMaterialId(null)}
            >
              <div
                className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                  <p className="text-echo-hint text-xs uppercase tracking-wide">Source Material</p>
                  <button
                    onClick={() => setExpandedMaterialId(null)}
                    className="text-echo-hint hover:text-echo-text transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  <p className="text-echo-text leading-relaxed whitespace-pre-wrap">
                    {material.content}
                  </p>
                  {/* English translation */}
                  {material.contentEn && material.contentEn !== material.content && (
                    <p className="text-blue-600 leading-relaxed mt-4 pt-4 border-t border-gray-100">
                      {material.contentEn}
                    </p>
                  )}
                  {material.note && (
                    <p className="text-echo-muted text-sm italic mt-4 pt-4 border-t border-gray-100">
                      Note: {material.note}
                    </p>
                  )}
                </div>
                <div className="p-4 border-t border-gray-100 flex-shrink-0">
                  <button
                    onClick={() => setExpandedMaterialId(null)}
                    className="w-full py-2 text-echo-muted hover:text-echo-text text-sm transition-colors"
                  >
                    Back to card
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Bottom actions - fixed */}
      <div className="pt-4 flex-shrink-0">
        <p className="text-echo-hint text-sm italic text-center mb-2">
          This card will fade. The only way to keep it is to speak.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleRegenerate}
            className="text-echo-hint hover:text-echo-muted text-sm underline"
          >
            New card
          </button>
          <span className="text-echo-hint">·</span>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-echo-hint hover:text-echo-muted text-sm underline"
          >
            + Add material
          </button>
        </div>
      </div>

      {/* Add Material Modal */}
      {showAddModal && (
        <AddMaterialModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddMaterial}
          onOpenAppleNotes={() => {
            setShowAddModal(false);
            setShowAppleNotesImporter(true);
          }}
        />
      )}

      {showAppleNotesImporter && (
        <AppleNotesImporter
          onClose={() => setShowAppleNotesImporter(false)}
          onImport={handleAppleNotesImport}
        />
      )}
    </div>
  );
}
