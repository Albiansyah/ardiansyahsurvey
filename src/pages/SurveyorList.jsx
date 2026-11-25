import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../lib/store";
import { supabase, restRequest } from "../lib/supabase";
import { toast } from "../lib/toast";
import { Search as IconSearch, User as IconUser, MoreVertical, Pencil, Trash2, Plus, Loader2 } from "lucide-react";

// Shadcn UI
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function SurveyorList() {
  const { surveyors = [], loadData } = useStore();
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const [editingSurveyor, setEditingSurveyor] = useState(null);
  const [editForm, setEditForm] = useState({ nama: "", email: "", active: true });
  const [editSubmitting, setEditSubmitting] = useState(false);
  
  const [deletingSurveyor, setDeletingSurveyor] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Real-time listener
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase.channel('surveyor-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        if (typeof loadData === "function") loadData();
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  const filtered = useMemo(() => {
    return surveyors.filter((s) => {
      const matchSearch = `${s?.nama || ""} ${s?.email || ""}`.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" ? true : statusFilter === "active" ? Boolean(s?.active) : !s?.active;
      return matchSearch && matchStatus;
    });
  }, [surveyors, search, statusFilter]);

  const handleEditClick = (surveyor) => {
    setEditingSurveyor(surveyor);
    setEditForm({ nama: surveyor.nama || "", email: surveyor.email || "", active: surveyor.active ?? true });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditSubmitting(true);
    try {
      await restRequest('users', { 
        method: 'PATCH', query: `id=eq.${editingSurveyor.id}`, 
        body: { nama: editForm.nama, email: editForm.email, active: editForm.active } 
      });
      toast.success("Data surveyor diperbarui");
      setEditingSurveyor(null);
      if (typeof loadData === "function") await loadData();
    } catch (error) {
      toast.error(error?.message || "Gagal memperbarui data");
    } finally { setEditSubmitting(false); }
  };

  const handleDeleteSubmit = async () => {
    setDeleteBusy(true);
    try {
      await restRequest('users', { method: 'DELETE', query: `id=eq.${deletingSurveyor.id}` });
      toast.success("Akun surveyor dihapus");
      setDeletingSurveyor(null);
      if (typeof loadData === "function") await loadData();
    } catch (error) {
      toast.error(error?.message || "Gagal menghapus akun");
    } finally { setDeleteBusy(false); }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* HEADER & TOMBOL TAMBAH */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-emerald-700">Manajemen akses</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Daftar Surveyor</h1>
          <p className="text-sm text-slate-600">Kelola data akun surveyor yang terdaftar di sistem.</p>
        </div>
        <Button asChild className="h-11 w-full bg-emerald-700 hover:bg-emerald-800 sm:w-auto">
          <Link to="/surveyors/tambah">
            <Plus className="mr-2 size-4" /> Tambah Surveyor
          </Link>
        </Button>
      </header>

      {/* FILTER & SEARCH */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs md:max-w-md">
          <IconSearch className="pointer-events-none absolute left-3 top-3 size-4 text-slate-500" />
          <Input 
            type="search" 
            placeholder="Cari nama atau email..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="h-11 w-full pl-9" 
          />
        </div>
        <div className="w-full sm:w-[160px] sm:flex-none">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-11 w-full">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="inactive">Nonaktif</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* LIST DATA */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center sm:p-12">
          <IconUser className="mx-auto size-10 text-slate-400" />
          <h3 className="mt-3 text-sm font-semibold text-slate-900">Surveyor tidak ditemukan</h3>
          <p className="mt-1 text-sm text-slate-600">Coba ubah kata kunci atau filter status.</p>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-slate-200">
            {filtered.map((surveyor) => (
              <article key={surveyor.id} className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-100 font-semibold text-slate-700">
                    {surveyor.nama?.[0]?.toUpperCase() || "?"}
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-slate-950">{surveyor.nama || "Tanpa Nama"}</h3>
                    <p className="truncate text-sm text-slate-600">{surveyor.email || "Tanpa Email"}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-3">
                  <Badge variant={surveyor.active ? "default" : "secondary"} className={surveyor.active ? "bg-emerald-100 text-emerald-900" : ""}>
                    {surveyor.active ? "Aktif" : "Nonaktif"}
                  </Badge>
                  
                  {/* TOMBOL CRUD (Titik Tiga) */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon" 
                        className="size-10 border-slate-200 bg-white hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-emerald-600"
                      >
                        <MoreVertical className="size-5 text-slate-700" />
                        <span className="sr-only">Buka menu aksi</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 shadow-lg">
                      <DropdownMenuLabel>Aksi Data</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleEditClick(surveyor)} className="cursor-pointer py-2.5">
                        <Pencil className="mr-2 size-4 text-slate-600" /> 
                        <span className="font-medium">Edit Data</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeletingSurveyor(surveyor)} className="cursor-pointer py-2.5 text-red-600 focus:bg-red-50 focus:text-red-700">
                        <Trash2 className="mr-2 size-4" /> 
                        <span className="font-medium">Hapus Akun</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </article>
            ))}
          </div>
        </Card>
      )}

      {/* MODAL EDIT */}
      <Dialog open={!!editingSurveyor} onOpenChange={(open) => !open && setEditingSurveyor(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Data Surveyor</DialogTitle>
            <DialogDescription>Perbarui informasi nama, email, atau status keaktifan.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nama Lengkap</Label>
              <Input value={editForm.nama} onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })} required className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>Status Akun</Label>
              <Select value={editForm.active ? "active" : "inactive"} onValueChange={(val) => setEditForm({ ...editForm, active: val === "active" })}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setEditingSurveyor(null)}>Batal</Button>
              <Button type="submit" disabled={editSubmitting} className="bg-emerald-700 hover:bg-emerald-800">
                {editSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DELETE */}
      <AlertDialog open={!!deletingSurveyor} onOpenChange={(open) => !open && setDeletingSurveyor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus akun surveyor?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun <strong>{deletingSurveyor?.nama}</strong> akan dihapus permanen dari sistem dan tidak dapat dipulihkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDeleteSubmit(); }} disabled={deleteBusy} className="bg-red-600 hover:bg-red-700">
              {deleteBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Trash2 className="mr-2 size-4" />}
              Ya, Hapus Akun
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}