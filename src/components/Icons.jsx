const base = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.75",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true"
};

export const IconHome = (props) => (
  <svg {...base} {...props}><path d="M3 9.5L12 3l9 6.5" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" /></svg>
);
export const IconDashboard = (props) => (
  <svg {...base} {...props}><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>
);
export const IconList = (props) => (
  <svg {...base} {...props}><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
);
export const IconPlus = (props) => (
  <svg {...base} {...props}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
export const IconDownload = (props) => (
  <svg {...base} {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
);
export const IconUser = (props) => (
  <svg {...base} {...props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
);
export const IconUserPlus = (props) => (
  <svg {...base} {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M16 11h6" /></svg>
);
export const IconKey = (props) => (
  <svg {...base} {...props}><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M16 7l3 3M14 9l2 2" /></svg>
);
export const IconEdit = (props) => (
  <svg {...base} {...props}><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
);
export const IconTrash = (props) => (
  <svg {...base} {...props}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /></svg>
);
export const IconFile = (props) => (
  <svg {...base} {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="15" x2="15" y2="15" /><line x1="9" y1="11" x2="15" y2="11" /></svg>
);
export const IconSheet = (props) => (
  <svg {...base} {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M8 13h8M8 17h8M8 13v4" /></svg>
);
export const IconCheck = (props) => (
  <svg {...base} strokeWidth="2.5" {...props}><polyline points="20 6 9 17 4 12" /></svg>
);
export const IconAlert = (props) => (
  <svg {...base} strokeWidth="2.25" {...props}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
);
export const IconInfo = (props) => (
  <svg {...base} strokeWidth="2.25" {...props}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
);
export const IconX = (props) => (
  <svg {...base} strokeWidth="2" {...props}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);
export const IconHistory = (props) => (
  <svg {...base} {...props}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l3 2" /></svg>
);
export const IconBuilding = (props) => (
  <svg {...base} {...props}><path d="M3 21h18" /><path d="M6 21V4h12v17" /><path d="M9 8h2M13 8h2M9 12h2M13 12h2M9 16h6" /></svg>
);
export const IconTarget = (props) => (
  <svg {...base} {...props}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg>
);
export const IconCamera = (props) => (
  <svg {...base} {...props}><path d="M14.5 5l-1-2h-3l-1 2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="4" /></svg>
);
export const IconMapPin = (props) => (
  <svg {...base} {...props}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0z" /><circle cx="12" cy="10" r="2.5" /></svg>
);
export const IconClock = (props) => (
  <svg {...base} {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const IconShield = (props) => (
  <svg {...base} {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>
);
export const IconUpload = (props) => (
  <svg {...base} {...props}><path d="M12 16V4" /><path d="M7 9l5-5 5 5" /><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /></svg>
);
export const IconSearch = (props) => (
  <svg {...base} {...props}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
);
export const IconFilter = (props) => (
  <svg {...base} {...props}><path d="M4 5h16M7 12h10M10 19h4" /></svg>
);
export const IconChevronDown = (props) => (
  <svg {...base} {...props}><path d="M6 9l6 6 6-6" /></svg>
);
export const IconRefresh = (props) => (
  <svg {...base} {...props}><path d="M20 11a8 8 0 1 0-2 5.5" /><path d="M20 4v7h-7" /></svg>
);
export const IconMore = (props) => (
  <svg {...base} {...props}><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></svg>
);
