// =============================================================================
// Tabs.tsx
// Reusable, accessible tabs, used for both the main tab row in the Operations
// panel and the small pill switches inside the Market and Assets tabs.
// It follows the standard WAI-ARIA "tabs" pattern: Left/Right arrow keys move
// between tabs, Home/End jump to the first/last tab, and only the selected
// tab can be reached with the Tab key.
//
// Also exports two small helpers: TabPanel (the content area a tab controls)
// and EmptyState (the "isn't available yet" message block).
// =============================================================================

// useRef keeps values between renders without redrawing; KeyboardEvent and ReactNode are TypeScript types only.
import { useRef, type KeyboardEvent, type ReactNode } from 'react';

// Describes one tab. K is the set of allowed tab keys (e.g. 'overview' | 'assets'), so typos are caught.
export type TabDef<K extends string> = {
  key: K;                                  // unique id for the tab
  label: string;                           // text shown on the tab
  icon?: ReactNode;                        // optional icon shown before the label
};

// The props (inputs) the Tabs component accepts.
type Props<K extends string> = {
  tabs: TabDef<K>[];                       // the list of tabs to draw
  active: K;                               // key of the currently selected tab
  onChange: (key: K) => void;              // called with the new key when the player picks a tab
  label: string;                           // name read by screen readers for the whole tab list
  idPrefix: string;                        // prefix for element ids, so two tab sets on one page don't clash
  variant?: 'tabs' | 'segmented';          // 'tabs' = underlined tab row, 'segmented' = pill switch
};

// The Tabs component. <K extends string> makes it generic so each use gets its own allowed keys.
export default function Tabs<K extends string>({ tabs, active, onChange, label, idPrefix, variant = 'tabs' }: Props<K>) {
  // Holds a reference to each tab's <button>, so arrow keys can move keyboard focus to it.
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  // Handles key presses while a tab has focus. "index" is the position of that tab.
  const onKeyDown = (e: KeyboardEvent, index: number) => {
    // -1 means "this key isn't one we handle".
    let next = -1;
    // Right arrow: next tab, wrapping from last back to first (% is remainder).
    if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
    // Left arrow: previous tab, wrapping from first to last.
    else if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    // Home: first tab.
    else if (e.key === 'Home') next = 0;
    // End: last tab.
    else if (e.key === 'End') next = tabs.length - 1;
    // Any other key: do nothing.
    if (next < 0) return;
    // Stop the browser's default action (e.g. Home scrolling the page).
    e.preventDefault();
    // Select the new tab.
    onChange(tabs[next].key);
    // Move keyboard focus to it ("?." skips if the button isn't there).
    refs.current[next]?.focus();
  // Closes onKeyDown.
  };

  // Draws the tab list.
  return (
    // role="tablist" tells screen readers this is a set of tabs. The CSS class depends on the variant.
    <div role="tablist" aria-label={label} className={variant === 'tabs' ? 'gg-tabs' : 'gg-seg'}>
      {/* Draw one button per tab. "i" is its position in the list. */}
      {tabs.map((t, i) => {
        // True if this is the selected tab.
        const selected = t.key === active;
        // Returns the button for this tab.
        return (
          // Each tab is a real <button>, so it works with keyboard and screen readers.
          <button
            // React needs a unique key for items in a list.
            key={t.key}
            // Save this button in refs at position i.
            ref={(el) => { refs.current[i] = el; }}
            // Screen readers announce it as a tab.
            role="tab"
            // A unique id, e.g. "ops-tab-assets"; the panel points back to it.
            id={`${idPrefix}-tab-${t.key}`}
            // Tells screen readers whether this tab is selected (the CSS also styles on this).
            aria-selected={selected}
            // Links the tab to the panel it shows, e.g. "ops-panel-assets".
            aria-controls={`${idPrefix}-panel-${t.key}`}
            // Only the selected tab is in the Tab-key order (0); the others are reached with arrow keys (-1).
            tabIndex={selected ? 0 : -1}
            // Tab-row variant gets the gg-tab class; the pill variant is styled through .gg-seg button.
            className={variant === 'tabs' ? 'gg-tab' : undefined}
            // Clicking selects this tab.
            onClick={() => onChange(t.key)}
            // Arrow/Home/End handling from above.
            onKeyDown={(e) => onKeyDown(e, i)}
          // End of the opening <button> tag.
          >
            {/* Optional icon. */}
            {t.icon}
            {/* Tab text. */}
            {t.label}
          </button>
        // Closes this tab's return.
        );
      // Closes the map.
      })}
    </div>
  // Closes the return statement.
  );
// Closes Tabs.
}

// The content area for a tab. It links back to its tab so screen readers know which tab it belongs to.
export function TabPanel({ idPrefix, tabKey, className, children }: { idPrefix: string; tabKey: string; className?: string; children: ReactNode }) {
  // Returns the panel wrapper.
  return (
    // The panel element.
    <div
      // Screen readers announce it as a tab panel.
      role="tabpanel"
      // Matches the tab's aria-controls, e.g. "ops-panel-assets".
      id={`${idPrefix}-panel-${tabKey}`}
      // Names the panel after its tab.
      aria-labelledby={`${idPrefix}-tab-${tabKey}`}
      // Optional CSS class (OpsPanel uses gg-tabpanel for scrolling and padding).
      className={className}
      // Lets keyboard users Tab into the panel content.
      tabIndex={0}
    // End of the opening <div> tag.
    >
      {/* Whatever was placed between <TabPanel> and </TabPanel>. */}
      {children}
    </div>
  // Closes the return statement.
  );
// Closes TabPanel.
}

// A centered icon + title + message, used when a feature has no data yet.
export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  // Returns the empty-state block.
  return (
    // .gg-empty in game.css centers everything in a column.
    <div className="gg-empty">
      {/* The large icon. */}
      {icon}
      {/* The title. */}
      <h3>{title}</h3>
      {/* The explanation text (whatever was placed between the tags). */}
      <p>{children}</p>
    </div>
  // Closes the return statement.
  );
// Closes EmptyState.
}
