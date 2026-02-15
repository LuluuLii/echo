import type { RawMaterial } from '../../lib/store/materials';

interface NoteCardProps {
  material: RawMaterial;
  onClick: () => void;
}

export function NoteCard({ material, onClick }: NoteCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl p-4 shadow-sm border border-gray-50 cursor-pointer hover:shadow-md hover:border-gray-100 transition-all group min-h-[120px] flex flex-col"
    >
      {/* Content preview - compact */}
      <p className="text-echo-text leading-snug line-clamp-3 flex-1 text-sm">
        {material.content}
      </p>
      {/* Footer with date */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
        <p className="text-echo-hint text-xs">
          {new Date(material.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </p>
        {/* Translation indicator */}
        {material.contentEn && (
          <span className="text-xs text-green-500 bg-green-50 px-1.5 py-0.5 rounded">EN</span>
        )}
      </div>
    </div>
  );
}
