interface ViewItem {
  id: string;
  view_name: string;
}

interface ViewSwitcherProps {
  views: ViewItem[];
  activeViewId: string;
  onViewChange: (viewId: string) => void;
}

export function ViewSwitcher({ views, activeViewId, onViewChange }: ViewSwitcherProps) {
  if (views.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-2">
        <span className="text-sm text-muted-foreground">Görünüm yok - bir ürün seçin</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 max-w-full">
      {views.map((view) => {
        const isActive = activeViewId === view.id;

        return (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={
              "h-10 px-6 rounded-lg text-sm font-medium transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
              (isActive
                ? "bg-foreground text-background border-foreground shadow-sm"
                : "bg-transparent text-foreground border-border hover:bg-muted")
            }
          >
            {view.view_name}
          </button>
        );
      })}
    </div>
  );
}
