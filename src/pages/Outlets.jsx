import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useStore } from "../lib/store";
import { toast } from "../lib/toast";
import {
  Building2 as IconBuilding,
  Pencil as IconEdit,
  Plus as IconPlus,
  Search as IconSearch,
  Trash2 as IconTrash,
  Upload as IconUpload,
  X as IconX,
  Loader2
} from "lucide-react";

// Shadcn UI
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const emptyForm = { outletName: "", picName: "", storeName: "", address: "", phone: "", email: "", latitude: "", longitude: "", status: "aktif", isDemo: false };

export default function Outlets() {
  const { outlets, addOutlet, updateOutlet, deleteOutlet, bulkAddOutlets } = useStore();
  
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  
  // State untuk Modal Form
  const [formOpen, setFormOpen] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState(null);
  
  // State untuk Konfirmasi Hapus
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const filtered = useMemo(() => {
    return outlets.filter((outlet) => 
      [outlet.outletName, outlet.picName, outlet.storeName, outlet.address, outlet.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [outlets, search]);

  const openCreate = () => {
    setEditingOutlet(null);
    setFormOpen(true);
  };

  const openEdit = (outlet) => {
    setEditingOutlet(outlet);
    setFormOpen(true);
  };

  const handleDeleteSubmit = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await deleteOutlet(deleteTarget.id);
      toast.success("Outlet dihapus");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error.message || "Outlet gagal dihapus");
    } finally {
      setDeleteBusy(false);
    }
  };

  const downloadTemplate = () => {
    const csv = "nama_outlet,nama_pic,nama_toko,alamat,nomor_hp,email,latitude,longitude,status\r\n";
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); 
    link.href = url; 
    link.download = "template-outlet.csv"; 
    link.click(); 
    URL.revokeObjectURL(url);
  };

  const handleBulkFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Berkas melebihi batas 5 MB.");
    setImporting(true);
    try {
      const rows = await readImportRows(file);
      if (rows.length > 5000) throw new Error("Berkas melebihi batas 5.000 baris.");
      const records = rows.map((row) => ({
        outletName: String(row.nama_outlet || row.outletName || "").trim(),
        picName: String(row.nama_pic || row.picName || "").trim(),
        storeName: String(row.nama_toko || row.storeName || "").trim(),
        address: String(row.alamat || row.address || "").trim(),
        phone: String(row.nomor_hp || row.phone || "").trim(),
        email: String(row.email || "").trim(),
        latitude: String(row.latitude || "").trim(),
        longitude: String(row.longitude || "").trim(),
        status: String(row.status || "aktif").toLowerCase() === "nonaktif" ? "nonaktif" : "aktif",
        isDemo: false
      }));
      const invalid = records.findIndex((record) => !record.outletName || !record.picName || !record.storeName || !record.address || !record.phone || !record.email);
      if (!records.length) throw new Error("Berkas tidak berisi data.");
      if (invalid >= 0) throw new Error(`Baris ${invalid + 2} belum lengkap.`);
      await bulkAddOutlets(records);
      toast.success(`${records.length} outlet berhasil diimpor`);
    } catch (error) {
      toast.error(error.message || "Berkas gagal diproses");
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* HEADER & ACTION BUTTONS */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-emerald-700">Master data</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Data Outlet Pelanggan</h1>
          <p className="text-sm text-slate-600">Sumber pilihan outlet pada formulir surveyor.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={downloadTemplate} className="h-11">
            Unduh Template
          </Button>
          
          <Button type="button" variant="outline" className="relative h-11 border-emerald-700 text-emerald-800 hover:bg-emerald-50" disabled={importing}>
            <IconUpload className="mr-2 size-4" />
            {importing ? "Mengimpor..." : "Bulk Upload"}
            <input 
              type="file" 
              accept=".xlsx,.xls,.csv" 
              className="absolute inset-0 cursor-pointer opacity-0" 
              onChange={handleBulkFile} 
              disabled={importing} 
            />
          </Button>
          
          <Button type="button" onClick={openCreate} className="h-11 bg-emerald-700 hover:bg-emerald-800">
            <IconPlus className="mr-2 size-4" /> Tambah Outlet
          </Button>
        </div>
      </header>

      {/* SEARCH BAR */}
      <div className="w-full max-w-md relative">
        <IconSearch className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-500" />
        <Input 
          type="search" 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          placeholder="Cari outlet, PIC, toko, atau email..." 
          className="h-11 pl-9 w-full" 
        />
      </div>

      {/* LIST DATA */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center sm:p-12">
          <IconBuilding className="mx-auto size-10 text-slate-400" />
          <h3 className="mt-3 text-sm font-semibold text-slate-900">
            {outlets.length ? "Outlet tidak ditemukan" : "Belum ada data outlet"}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {outlets.length ? "Coba ubah kata kunci pencarian." : "Tambah manual atau unggah data menggunakan template."}
          </p>
          {!outlets.length && (
            <Button onClick={openCreate} className="mt-4 bg-slate-900">Tambah Outlet Pertama</Button>
          )}
        </div>
      ) : (
        <>
          {/* TAMPILAN MOBILE (CARD) */}
          <div className="grid gap-3 md:hidden">
            {filtered.map((outlet) => (
              <Card key={outlet.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-slate-950">{outlet.outletName}</h2>
                    <p className="truncate text-xs text-slate-600">{outlet.storeName}</p>
                  </div>
                  <Badge variant={outlet.status === "aktif" ? "default" : "secondary"} className={outlet.status === "aktif" ? "bg-emerald-100 text-emerald-900" : ""}>
                    {outlet.status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-slate-500">PIC</p>
                    <p className="font-medium text-slate-800">{outlet.picName}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Kontak</p>
                    <p className="font-medium text-slate-800 truncate">{outlet.phone}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-500">Alamat</p>
                    <p className="text-slate-800 line-clamp-2">{outlet.address}</p>
                  </div>
                </div>

                {outlet.isDemo && (
                  <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">Data Demo</Badge>
                )}

                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={() => openEdit(outlet)} className="h-10 flex-1">
                    <IconEdit className="mr-2 size-4" /> Edit
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setDeleteTarget(outlet)} className="h-10 flex-1 border-red-200 text-red-700 hover:bg-red-50">
                    <IconTrash className="mr-2 size-4" /> Hapus
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* TAMPILAN DESKTOP (TABLE) */}
          <Card className="hidden md:block overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold">Outlet dan Toko</TableHead>
                  <TableHead className="font-semibold">PIC</TableHead>
                  <TableHead className="font-semibold">Kontak</TableHead>
                  <TableHead className="font-semibold">Alamat</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right font-semibold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((outlet) => (
                  <TableRow key={outlet.id} className="hover:bg-slate-50/50">
                    <TableCell>
                      <p className="font-semibold text-slate-950">{outlet.outletName}</p>
                      <p className="text-xs text-slate-600">{outlet.storeName}</p>
                      {outlet.isDemo && (
                        <Badge variant="outline" className="mt-1 border-amber-300 bg-amber-50 text-amber-900 text-[10px]">Demo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-700">{outlet.picName}</TableCell>
                    <TableCell>
                      <p className="text-slate-700">{outlet.phone}</p>
                      <p className="text-xs text-slate-500">{outlet.email}</p>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-slate-700" title={outlet.address}>
                      {outlet.address}
                    </TableCell>
                    <TableCell>
                      <Badge variant={outlet.status === "aktif" ? "default" : "secondary"} className={outlet.status === "aktif" ? "bg-emerald-100 text-emerald-900" : ""}>
                        {outlet.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(outlet)} className="h-9 w-9 text-slate-600 hover:text-emerald-700">
                          <IconEdit className="size-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setDeleteTarget(outlet)} className="h-9 w-9 text-slate-600 hover:text-red-700 hover:bg-red-50">
                          <IconTrash className="size-4" />
                          <span className="sr-only">Hapus</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* MODAL FORM (CREATE/EDIT) */}
      <OutletFormDialog 
        open={formOpen} 
        onOpenChange={setFormOpen} 
        outlet={editingOutlet}
        onSave={async (data) => {
          try {
            if (editingOutlet) {
              await updateOutlet(editingOutlet.id, data);
              toast.success("Outlet diperbarui");
            } else {
              await addOutlet(data);
              toast.success("Outlet ditambahkan");
            }
            setFormOpen(false);
          } catch (error) {
            toast.error(error.message || "Outlet gagal disimpan");
            throw error;
          }
        }} 
      />

      {/* MODAL KONFIRMASI HAPUS */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus outlet ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Outlet <strong>{deleteTarget?.outletName}</strong> akan dihapus permanen dari sistem dan tidak akan muncul di pilihan surveyor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleDeleteSubmit(); }} 
              disabled={deleteBusy} 
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <IconTrash className="mr-2 size-4" />}
              Ya, Hapus Outlet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ===================== KOMPONEN FORM DIALOG =====================
function OutletFormDialog({ open, onOpenChange, outlet, onSave }) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const firstRef = useRef(null);

  useEffect(() => {
    if (open) {
      if (outlet) setForm({ ...outlet });
      else setForm(emptyForm);
      
      // Beri sedikit delay agar animasi dialog selesai sebelum focus
      setTimeout(() => firstRef.current?.focus(), 100);
    }
  }, [open, outlet]);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSave(form);
    } catch {
      // error toast ditangani di parent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{outlet ? "Edit Outlet" : "Tambah Outlet"}</DialogTitle>
          <DialogDescription>
            {outlet ? "Perbarui informasi detail outlet." : "Masukkan data kontak utama outlet dengan lengkap."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="outletName">Nama Outlet <span className="text-red-700">*</span></Label>
            <Input id="outletName" ref={firstRef} required value={form.outletName} onChange={(e) => set("outletName", e.target.value)} className="h-11" />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="storeName">Nama Toko <span className="text-red-700">*</span></Label>
            <Input id="storeName" required value={form.storeName} onChange={(e) => set("storeName", e.target.value)} className="h-11" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="picName">Nama PIC <span className="text-red-700">*</span></Label>
            <Input id="picName" required value={form.picName} onChange={(e) => set("picName", e.target.value)} className="h-11" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Nomor HP <span className="text-red-700">*</span></Label>
            <Input id="phone" required value={form.phone} onChange={(e) => set("phone", e.target.value)} className="h-11" />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="email">Email <span className="text-red-700">*</span></Label>
            <Input id="email" type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} className="h-11" />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(value) => set("status", value)}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aktif">Aktif</SelectItem>
                <SelectItem value="nonaktif">Nonaktif</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="address">Alamat Lengkap <span className="text-red-700">*</span></Label>
            <Input id="address" required value={form.address} onChange={(e) => set("address", e.target.value)} className="h-11" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="latitude">Latitude (Opsional)</Label>
            <Input id="latitude" type="number" step="any" value={form.latitude} onChange={(e) => set("latitude", e.target.value)} className="h-11" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="longitude">Longitude (Opsional)</Label>
            <Input id="longitude" type="number" step="any" value={form.longitude} onChange={(e) => set("longitude", e.target.value)} className="h-11" />
          </div>

          <p className="text-xs leading-relaxed text-slate-600 sm:col-span-2 bg-slate-50 p-3 rounded-md">
            Koordinat outlet memungkinkan sistem menghitung jarak titik foto ke outlet. Verifikasi server tetap diperlukan untuk mitigasi spoofing tingkat lanjut.
          </p>

          <DialogFooter className="sm:col-span-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Batal
            </Button>
            <Button type="submit" disabled={submitting} className="bg-emerald-700 hover:bg-emerald-800">
              {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {outlet ? "Simpan Perubahan" : "Tambah Outlet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ===================== FUNGSI PEMBANTU BACA FILE =====================
async function readImportRows(file) {
  if (file.name.toLowerCase().endsWith(".csv")) return parseCsv(await file.text());
  const ExcelJSModule = await import("exceljs");
  const Workbook = ExcelJSModule.Workbook || ExcelJSModule.default?.Workbook;
  const workbook = new Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];
  const headers = worksheet.getRow(1).values.slice(1).map((value) => String(value || "").trim());
  const rows = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record = {};
    headers.forEach((header, index) => { record[header] = row.getCell(index + 1).text || ""; });
    if (Object.values(record).some((value) => String(value).trim())) rows.push(record);
  });
  return rows;
}

function parseCsv(text) {
  const matrix = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) matrix.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  row.push(cell);
  if (row.some((value) => value.trim())) matrix.push(row);
  const headers = (matrix.shift() || []).map((value) => value.replace(/^\uFEFF/, "").trim());
  return matrix.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}