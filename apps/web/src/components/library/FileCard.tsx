import type { RawMaterial } from '../../lib/store/materials';

interface FileCardProps {
  material: RawMaterial;
  onClick: () => void;
}

export function FileCard({ material, onClick }: FileCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl p-3 shadow-sm border border-gray-50 cursor-pointer hover:shadow-md hover:border-gray-100 transition-all group"
    >
      {/* File Preview */}
      <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 mb-2">
        {(material.fileType === 'image' || (material.type as string) === 'image') && material.fileData ? (
          <img
            src={material.fileData}
            alt={material.fileName || 'Image'}
            className="w-full h-full object-cover"
          />
        ) : material.fileType === 'pdf' ? (
          <div className="w-full h-full flex items-center justify-center bg-red-50">
            <span className="text-3xl">📄</span>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <span className="text-3xl">📁</span>
          </div>
        )}
      </div>
      {/* File Name */}
      <p className="text-sm text-echo-text truncate" title={material.fileName || material.content}>
        {material.fileName || material.content}
      </p>
      <p className="text-xs text-echo-hint mt-1">
        {new Date(material.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })}
      </p>
    </div>
  );
}
