import { useMaterialsStore } from '../lib/store/materials';

export function Insights() {
  const { materials } = useMaterialsStore();

  // Calculate some basic stats
  const totalMaterials = materials.length;
  const materialsWithNotes = materials.filter((m) => m.note).length;
  const recentMaterials = materials.filter(
    (m) => Date.now() - m.createdAt < 7 * 24 * 60 * 60 * 1000
  ).length;

  if (totalMaterials === 0) {
    return (
      <div className="max-w-xl mx-auto text-center py-12">
        <h1 className="text-2xl font-semibold text-echo-text mb-2">Insights</h1>
        <p className="text-echo-muted mb-8">
          Start adding materials to see your learning patterns.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold text-echo-text mb-2">Insights</h1>
      <p className="text-echo-muted mb-8">
        Your learning journey at a glance.
      </p>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50 text-center">
          <p className="text-3xl font-semibold text-echo-text">{totalMaterials}</p>
          <p className="text-echo-hint text-sm mt-1">Materials</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50 text-center">
          <p className="text-3xl font-semibold text-echo-text">{materialsWithNotes}</p>
          <p className="text-echo-hint text-sm mt-1">With Notes</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50 text-center">
          <p className="text-3xl font-semibold text-echo-text">{recentMaterials}</p>
          <p className="text-echo-hint text-sm mt-1">This Week</p>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-50">
        <h2 className="text-lg font-medium text-echo-text mb-4">Coming Soon</h2>
        <ul className="space-y-3 text-echo-muted">
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-echo-accent rounded-full"></span>
            Topic clusters visualization
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-echo-accent rounded-full"></span>
            Learning timeline
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-echo-accent rounded-full"></span>
            Expression patterns
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-echo-accent rounded-full"></span>
            Weekly progress reports
          </li>
        </ul>
      </div>
    </div>
  );
}
