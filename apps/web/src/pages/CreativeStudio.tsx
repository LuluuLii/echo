import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectsStore } from '../lib/store/projects';
import type { Project, ProjectTask, ProjectType } from '@echo/core/models';
import { calculateCompletionPercent } from '@echo/core/models';

type ViewMode = 'projects' | 'tasks' | 'quick';

const PROJECT_COLORS = [
  '#8B5CF6', // Purple
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
];

const PROJECT_ICONS: Record<ProjectType, string> = {
  practice: '📚',
  creation: '✍️',
  'exam-prep': '🎯',
};

export function CreativeStudio() {
  const navigate = useNavigate();
  const { projects, tasks, init, initialized, createProject, deleteProject, completeTask } = useProjectsStore();
  const [viewMode, setViewMode] = useState<ViewMode>('projects');
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectType, setNewProjectType] = useState<ProjectType>('practice');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  useEffect(() => {
    if (!initialized) {
      init();
    }
  }, [initialized, init]);

  const activeProjects = projects.filter((p) => p.status === 'active');
  const pendingTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress');

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;

    const color = PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)];
    createProject({
      name: newProjectName.trim(),
      description: newProjectDesc.trim() || undefined,
      type: newProjectType,
      color,
    });

    setNewProjectName('');
    setNewProjectDesc('');
    setShowNewProject(false);
  };

  const handleQuickSession = () => {
    navigate('/session');
  };

  const handleProjectClick = (project: Project) => {
    // For now, navigate to session with project context
    // Later: navigate to project detail page
    navigate('/session', { state: { projectId: project.id } });
  };

  const handleTaskClick = (task: ProjectTask) => {
    // Navigate to session with task context
    navigate('/session', {
      state: {
        projectId: task.projectId,
        taskId: task.id,
        preselectedMaterials: task.materialIds,
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-echo-text">Creative Studio</h1>
          <p className="text-echo-muted">Your space for expression and growth.</p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('projects')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'projects'
                ? 'bg-white text-echo-text shadow-sm'
                : 'text-echo-muted hover:text-echo-text'
            }`}
          >
            Projects
          </button>
          <button
            onClick={() => setViewMode('tasks')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'tasks'
                ? 'bg-white text-echo-text shadow-sm'
                : 'text-echo-muted hover:text-echo-text'
            }`}
          >
            Tasks ({pendingTasks.length})
          </button>
          <button
            onClick={() => setViewMode('quick')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'quick'
                ? 'bg-white text-echo-text shadow-sm'
                : 'text-echo-muted hover:text-echo-text'
            }`}
          >
            Quick Start
          </button>
        </div>
      </div>

      {/* Quick Start View */}
      {viewMode === 'quick' && (
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleQuickSession}
              className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-echo-text transition-colors text-left"
            >
              <span className="text-3xl mb-3 block">💭</span>
              <h3 className="font-medium text-echo-text mb-1">Free Expression</h3>
              <p className="text-echo-muted text-sm">
                Start a session without a specific goal. Just express yourself.
              </p>
            </button>
            <button
              onClick={() => {
                setViewMode('projects');
                setShowNewProject(true);
              }}
              className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-echo-text transition-colors text-left"
            >
              <span className="text-3xl mb-3 block">📁</span>
              <h3 className="font-medium text-echo-text mb-1">New Project</h3>
              <p className="text-echo-muted text-sm">
                Create a focused project for sustained practice.
              </p>
            </button>
          </div>

          {/* Recent Activity */}
          {activeProjects.length > 0 && (
            <div>
              <h2 className="text-lg font-medium text-echo-text mb-4">Continue Working</h2>
              <div className="space-y-3">
                {activeProjects.slice(0, 3).map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleProjectClick(project)}
                    className="w-full p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-gray-200 transition-colors text-left flex items-center gap-4"
                  >
                    <span
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg"
                      style={{ backgroundColor: project.color || '#8B5CF6' }}
                    >
                      {PROJECT_ICONS[project.type]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-echo-text truncate">{project.name}</h3>
                      <p className="text-echo-muted text-sm">
                        {calculateCompletionPercent(project.progress)}% complete · {project.progress.totalSessions} sessions
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Projects View */}
      {viewMode === 'projects' && (
        <div className="space-y-6">
          {/* New Project Button / Form */}
          {showNewProject ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-medium text-echo-text mb-4">Create New Project</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-echo-muted mb-1">Name</label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g., IELTS Speaking Practice"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-echo-text"
                  />
                </div>
                <div>
                  <label className="block text-sm text-echo-muted mb-1">Type</label>
                  <div className="flex gap-2">
                    {(['practice', 'creation', 'exam-prep'] as ProjectType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => setNewProjectType(type)}
                        className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                          newProjectType === type
                            ? 'bg-echo-text text-white'
                            : 'bg-gray-100 text-echo-muted hover:bg-gray-200'
                        }`}
                      >
                        {PROJECT_ICONS[type]} {type.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-echo-muted mb-1">Description (optional)</label>
                  <textarea
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    placeholder="What's this project about?"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-echo-text resize-none"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowNewProject(false)}
                    className="px-4 py-2 text-echo-muted hover:text-echo-text"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateProject}
                    disabled={!newProjectName.trim()}
                    className="px-6 py-2 bg-echo-text text-white rounded-lg disabled:opacity-50"
                  >
                    Create Project
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewProject(true)}
              className="w-full p-4 border-2 border-dashed border-gray-200 rounded-xl text-echo-muted hover:border-echo-text hover:text-echo-text transition-colors"
            >
              + New Project
            </button>
          )}

          {/* Active Projects */}
          {activeProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeProjects.map((project) => (
                <div
                  key={project.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  <div
                    className="h-2"
                    style={{ backgroundColor: project.color || '#8B5CF6' }}
                  />
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{PROJECT_ICONS[project.type]}</span>
                        <div>
                          <h3 className="font-medium text-echo-text">{project.name}</h3>
                          <p className="text-echo-hint text-xs capitalize">{project.type.replace('-', ' ')}</p>
                        </div>
                      </div>
                    </div>

                    {project.description && (
                      <p className="text-echo-muted text-sm mb-3 line-clamp-2">{project.description}</p>
                    )}

                    {/* Progress */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-echo-muted mb-1">
                        <span>Progress</span>
                        <span>{calculateCompletionPercent(project.progress)}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${calculateCompletionPercent(project.progress)}%`,
                            backgroundColor: project.color || '#8B5CF6',
                          }}
                        />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-4 text-xs text-echo-muted mb-4">
                      <span>{project.progress.totalSessions} sessions</span>
                      <span>{project.progress.totalArtifacts} expressions</span>
                      <span>{project.progress.completedTasks}/{project.progress.totalTasks} tasks</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleProjectClick(project)}
                        className="flex-1 px-4 py-2 bg-echo-text text-white rounded-lg text-sm hover:bg-gray-700"
                      >
                        Continue
                      </button>
                      <button
                        onClick={() => deleteProject(project.id)}
                        className="px-3 py-2 text-echo-hint hover:text-red-500 transition-colors"
                        title="Delete project"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !showNewProject && (
              <div className="text-center py-12">
                <p className="text-echo-muted mb-4">No projects yet. Create one to get started!</p>
              </div>
            )
          )}
        </div>
      )}

      {/* Tasks View */}
      {viewMode === 'tasks' && (
        <div className="space-y-6">
          {pendingTasks.length > 0 ? (
            <div className="space-y-3">
              {pendingTasks.map((task) => {
                const project = projects.find((p) => p.id === task.projectId);
                return (
                  <div
                    key={task.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
                  >
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => completeTask(task.id)}
                        className="mt-1 w-5 h-5 rounded border-2 border-gray-300 hover:border-echo-text flex-shrink-0"
                        title="Mark complete"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-echo-text">{task.title}</h3>
                        {task.description && (
                          <p className="text-echo-muted text-sm mt-1">{task.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-echo-hint">
                          {project && (
                            <span
                              className="px-2 py-0.5 rounded"
                              style={{ backgroundColor: `${project.color}20`, color: project.color }}
                            >
                              {project.name}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded ${
                            task.priority === 'high' ? 'bg-red-100 text-red-600' :
                            task.priority === 'medium' ? 'bg-amber-100 text-amber-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {task.priority}
                          </span>
                          {task.dueAt && (
                            <span>Due {new Date(task.dueAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleTaskClick(task)}
                        className="px-4 py-2 bg-gray-100 text-echo-text rounded-lg text-sm hover:bg-gray-200"
                      >
                        Start
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-echo-muted mb-4">No pending tasks. Create a project and add tasks to get started!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
