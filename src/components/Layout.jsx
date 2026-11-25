import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Download,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Store,
  Target,
  Upload,
  User,
  UserPlus,
  WifiOff,
  ListChecks // <-- Tambahan: Import ikon ListChecks
} from "lucide-react";
import Brand from "@/components/Brand";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useStore } from "@/lib/store";
import { toast } from "@/lib/toast";

const surveyorNav = [
  { to: "/", label: "Beranda", Icon: LayoutDashboard },
  { to: "/form", label: "Survei Baru", mobileLabel: "Survei", Icon: Plus },
  { to: "/reports", label: "Laporan", Icon: FileText },
  { to: "/history", label: "Riwayat", Icon: History }
];

const masterPrimaryNav = [
  { to: "/", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/reports", label: "Laporan", Icon: FileText },
  { to: "/outlets", label: "Outlet", Icon: Store },
  { to: "/targets", label: "Target", Icon: Target }
];

const masterMoreNav = [
  { 
    label: "Akun Surveyor", 
    Icon: UserPlus,
    children: [
      { to: "/surveyors", label: "Daftar Surveyor" },
      { to: "/surveyors/tambah", label: "Tambah Surveyor" }
    ]
  },
  { to: "/questions", label: "Kelola Pertanyaan", Icon: ListChecks }, // <-- Tambahan: Menu Kelola Pertanyaan
  { to: "/export", label: "Unduh Data", Icon: Download },
  { to: "/backup", label: "Cadangan dan Pemulihan", Icon: Upload },
  { to: "/history", label: "Log Aktivitas", Icon: History },
  { to: "/profile", label: "Profil", Icon: User }
];

export default function Layout({ children }) {
  const user = useStore((state) => state.user);
  const logout = useStore((state) => state.logout);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { online } = useNetworkStatus();
  const { queueCount, syncing } = useOfflineSync();
  
  const isMaster = user?.role === "master";
  const desktopNav = isMaster ? [...masterPrimaryNav, ...masterMoreNav] : surveyorNav;

  const isActive = (to) => {
    if (to === "/") return pathname === "/";
    if (to === "/surveyors" || to === "/surveyors/tambah") return pathname === to;
    return pathname === to || pathname.startsWith(`${to}/`);
  };

  const initials = user?.nama?.trim()?.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "AS";

  const handleLogout = async () => {
    await logout();
    toast.success("Anda telah keluar dari aplikasi.");
    navigate("/");
  };

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-950 md:flex">
      {/* ================= SIDEBAR DESKTOP ================= */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="border-b border-slate-200 px-5 py-5">
          <Brand />
        </div>
        
        {!online && (
          <div className="m-3 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950" role="status">
            <WifiOff className="size-4" aria-hidden="true" /> Offline
          </div>
        )}
        {online && syncing && (
          <div className="m-3 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950" role="status">
            <RefreshCw className="size-4 animate-spin" aria-hidden="true" /> Menyinkronkan {queueCount} survei
          </div>
        )}
        
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Navigasi utama">
          {desktopNav.map((item, index) => {
            if (item.children) {
              const isChildActive = item.children.some(child => isActive(child.to));
              return (
                <Collapsible key={item.label} defaultOpen={isChildActive} className="group/collapsible">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className={`flex w-full min-h-11 items-center justify-between rounded-r-md border-l-[3px] px-3 text-sm transition-all duration-300 ease-in-out ${
                        isChildActive 
                          ? "border-emerald-700 bg-emerald-100/80 font-semibold text-emerald-950 shadow-sm" 
                          : "border-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.Icon className={`size-5 flex-none transition-colors ${isChildActive ? "text-emerald-700" : ""}`} aria-hidden="true" />
                        <span>{item.label}</span>
                      </div>
                      <ChevronDown className="size-4 transition-transform duration-300 group-data-[state=open]/collapsible:rotate-180" aria-hidden="true" />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="transition-all duration-300">
                    <div className="pl-11 pr-3 py-1 space-y-1">
                      {item.children.map((child) => {
                        const childActive = isActive(child.to);
                        return (
                          <Link
                            key={child.to}
                            to={child.to}
                            aria-current={childActive ? "page" : undefined}
                            className={`block min-h-9 rounded-md px-3 py-2 text-sm transition-all duration-200 ${
                              childActive 
                                ? "bg-emerald-600 font-semibold text-white shadow-md" 
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            }`}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            }

            const active = isActive(item.to);
            return (
              <Link
                key={item.to || index}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-r-md border-l-[3px] px-3 text-sm transition-all duration-300 ease-in-out ${
                  active 
                    ? "border-emerald-700 bg-emerald-100/80 font-semibold text-emerald-950 shadow-sm" 
                    : "border-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                <item.Icon className={`size-5 flex-none transition-colors ${active ? "text-emerald-700" : ""}`} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <AccountMenu user={user} initials={initials} onLogout={handleLogout} align="start" />
      </aside>

      {/* ================= HEADER & KONTEN UTAMA ================= */}
      <div className="min-w-0 flex-1 pb-24 md:ml-64 md:pb-0">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 md:hidden">
          <Brand />
          <div className="flex items-center gap-2">
            {!online && <Badge className="border-amber-300 bg-amber-50 text-amber-950"><WifiOff aria-hidden="true" /> Offline</Badge>}
            {online && syncing && <Badge className="border-emerald-200 bg-emerald-50 text-emerald-950"><RefreshCw className="animate-spin" aria-hidden="true" /> Sinkronisasi</Badge>}
            <AccountMenu user={user} initials={initials} onLogout={handleLogout} />
          </div>
        </header>
        
        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      {/* ================= BOTTOM NAV ================= */}
      {isMaster ? (
        <MasterBottomNav pathname={pathname} isActive={isActive} />
      ) : (
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Navigasi utama mobile">
          {surveyorNav.map((item) => <MobileNavItem key={item.to} item={item} active={isActive(item.to)} />)}
        </nav>
      )}
    </div>
  );
}

function AccountMenu({ user, initials, onLogout, align = "end" }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="m-3 flex min-h-11 items-center gap-3 rounded-md p-1.5 text-left outline-none ring-offset-2 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-ring md:w-[calc(100%-1.5rem)]" aria-label="Buka menu akun">
        <Avatar>
          <AvatarFallback className="bg-emerald-100 font-semibold text-emerald-900">{initials}</AvatarFallback>
        </Avatar>
        <span className="hidden min-w-0 flex-1 md:block">
          <span className="block truncate text-sm font-semibold">{user?.nama}</span>
          <span className="block text-xs text-slate-600">{user?.role === "master" ? "Master" : "Surveyor"}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-60">
        <DropdownMenuLabel>
          <span className="block truncate">{user?.nama}</span>
          <span className="block truncate text-xs font-normal text-slate-600">{user?.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="min-h-11">
          <Link to="/profile"><User aria-hidden="true" /> Profil</Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="min-h-11 text-red-700 focus:text-red-800" onSelect={onLogout}>
          <LogOut aria-hidden="true" /> Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileNavItem({ item: { to, label, mobileLabel, Icon }, active }) {
  return (
    <Link 
      to={to} 
      aria-current={active ? "page" : undefined} 
      className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 border-t-[3px] px-1 text-[11px] transition-all duration-300 ease-in-out ${
        active 
          ? "border-emerald-700 bg-emerald-50/80 font-semibold text-emerald-950" 
          : "border-transparent text-slate-600 hover:bg-slate-50"
      }`}
    >
      <Icon className="size-5" aria-hidden="true" />
      <span className="max-w-full truncate">{mobileLabel || label}</span>
    </Link>
  );
}

function MasterBottomNav({ pathname, isActive }) {
  const moreActive = masterMoreNav.some((item) => item.to ? isActive(item.to) : item.children?.some(child => isActive(child.to)));
  
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Navigasi utama mobile">
      {masterPrimaryNav.map((item) => <MobileNavItem key={item.to} item={item} active={isActive(item.to)} />)}
      <Sheet>
        <SheetTrigger 
          className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 border-t-[3px] px-1 text-[11px] transition-all duration-300 ${
            moreActive 
              ? "border-emerald-700 bg-emerald-50/80 font-semibold text-emerald-950" 
              : "border-transparent text-slate-600 hover:bg-slate-50"
          }`} 
          aria-label="Buka navigasi lainnya"
        >
          <Menu className="size-5" aria-hidden="true" />
          <span>Lainnya</span>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-xl pb-[env(safe-area-inset-bottom)]">
          <SheetHeader>
            <SheetTitle>Navigasi lainnya</SheetTitle>
            <SheetDescription>Kelola akun, data, dan profil aplikasi.</SheetDescription>
          </SheetHeader>
          <div className="space-y-1 px-4 pb-4">
            {masterMoreNav.map((item) => {
              if (item.children) {
                const isChildActive = item.children.some(child => isActive(child.to));
                return (
                  <Collapsible key={item.label} defaultOpen={isChildActive} className="group/mobile-collapsible">
                    <CollapsibleTrigger asChild>
                      <button 
                        type="button" 
                        className={`flex w-full min-h-11 items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ${
                          isChildActive ? "bg-emerald-100 text-emerald-950 font-semibold" : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <item.Icon className={`size-5 flex-none ${isChildActive ? "text-emerald-700" : ""}`} aria-hidden="true" />
                          <span>{item.label}</span>
                        </div>
                        <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]/mobile-collapsible:rotate-180" aria-hidden="true" />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="pl-11 pr-2 py-1 space-y-1">
                        {item.children.map((child) => {
                           const childActive = isActive(child.to);
                           return (
                            <SheetClose key={child.to} asChild>
                              <Link 
                                to={child.to} 
                                aria-current={childActive ? "page" : undefined} 
                                className={`block min-h-10 rounded-md px-3 py-2 text-sm transition-all duration-200 ${
                                  childActive ? "bg-emerald-600 font-semibold text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                }`}
                              >
                                {child.label}
                              </Link>
                            </SheetClose>
                           )
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              }
              
              const active = isActive(item.to);
              return (
                <SheetClose key={item.to} asChild>
                  <Link 
                    to={item.to} 
                    aria-current={active ? "page" : undefined} 
                    className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm transition-all duration-200 ${
                      active ? "bg-emerald-100 font-semibold text-emerald-950" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <item.Icon className={`size-5 ${active ? "text-emerald-700" : ""}`} aria-hidden="true" /> {item.label}
                  </Link>
                </SheetClose>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}