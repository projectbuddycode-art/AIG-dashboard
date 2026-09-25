function Icon({ path, className }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className ?? "h-4 w-4 shrink-0"}>
      <path d={path} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const Icons = {
  dashboard: (props?: { className?: string }) => (
    <Icon {...props} path="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
  ),
  customers: (props?: { className?: string }) => (
    <Icon {...props} path="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m9 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  ),
  machines: (props?: { className?: string }) => (
    <Icon {...props} path="M4 7h16v12H4zM8 7V5h8v2M8 13h8" />
  ),
  plans: (props?: { className?: string }) => (
    <Icon {...props} path="M7 4h10v16H7zM10 8h4M10 12h4M10 16h2" />
  ),
  subscriptions: (props?: { className?: string }) => (
    <Icon {...props} path="M4 7h16M4 12h16M4 17h10" />
  ),
  activity: (props?: { className?: string }) => (
    <Icon {...props} path="M4 12h4l2-6 4 12 2-6h4" />
  ),
  settings: (props?: { className?: string }) => (
    <Icon {...props} path="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M4.5 12h2M17.5 12h2M6.7 6.7l1.4 1.4M15.9 15.9l1.4 1.4M6.7 17.3l1.4-1.4M15.9 8.1l1.4-1.4" />
  ),
  menu: (props?: { className?: string }) => <Icon {...props} path="M5 7h14M5 12h14M5 17h14" />,
  close: (props?: { className?: string }) => <Icon {...props} path="M6 6l12 12M18 6 6 18" />,
};
