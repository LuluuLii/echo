interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && <span className="text-4xl mb-4">{icon}</span>}
      <h3 className="text-lg font-medium text-echo-text mb-2">{title}</h3>
      {description && (
        <p className="text-echo-muted text-sm max-w-md mb-4">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-echo-text text-white rounded-lg text-sm hover:bg-gray-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
