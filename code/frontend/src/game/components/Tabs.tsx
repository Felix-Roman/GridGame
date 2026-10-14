import { useRef, type KeyboardEvent, type ReactNode } from 'react';

// Accessible tab list (WAI-ARIA tabs pattern): arrow keys move between tabs,
// Home/End jump to the ends, only the selected tab is in the Tab order.

export type TabDef<K extends string> = { key: K; label: string; icon?: ReactNode };

type Props<K extends string> = {
  tabs: TabDef<K>[];
  active: K;
  onChange: (key: K) => void;
  label: string;
  idPrefix: string;
  variant?: 'tabs' | 'segmented';
};

export default function Tabs<K extends string>({ tabs, active, onChange, label, idPrefix, variant = 'tabs' }: Props<K>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    let next = -1;
    if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(tabs[next].key);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label={label} className={variant === 'tabs' ? 'gg-tabs' : 'gg-seg'}>
      {tabs.map((t, i) => {
        const selected = t.key === active;
        return (
          <button
            key={t.key}
            ref={(el) => { refs.current[i] = el; }}
            role="tab"
            id={`${idPrefix}-tab-${t.key}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${t.key}`}
            tabIndex={selected ? 0 : -1}
            className={variant === 'tabs' ? 'gg-tab' : undefined}
            onClick={() => onChange(t.key)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {t.icon}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ idPrefix, tabKey, className, children }: { idPrefix: string; tabKey: string; className?: string; children: ReactNode }) {
  return (
    <div
      role="tabpanel"
      id={`${idPrefix}-panel-${tabKey}`}
      aria-labelledby={`${idPrefix}-tab-${tabKey}`}
      className={className}
      tabIndex={0}
    >
      {children}
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="gg-empty">
      {icon}
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
