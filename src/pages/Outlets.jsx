import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../lib/store";
import { EmptyState } from "../components/PageState";
import { IconBuilding, IconEdit, IconPlus, IconSearch, IconTrash, IconUpload, IconX } from "../components/Icons";
import { toast, useConfirmStore } from "../lib/toast";

const emptyForm = { outletName: "", picName: "", storeName: "", address: "", phone: "", email: "", latitude: "", longitude: "", status: "aktif", isDemo: false };
const fieldClass = "min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20";

export default function Outlets() {
  const { outlets, addOutlet, updateOutlet, deleteOutlet, bulkAddOutlets } = useStore();
  const confirmStore = useConfirmStore();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [importing, setImporting] = useState(false);
  const filtered = useMemo(() => outlets.filter((outlet) => [outlet.outletName, outlet.picName, outlet.storeName, outlet.address, outlet.email].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase())), [outlets, search]);

  const openCreate = () => { setEditing(null); setShowForm(true); };
  const openEdit = (outlet) => { setEditing(outlet); setShowForm(true); };
  const handleDelete = (outlet) => confirmStore.open({
    title: "Hapus outlet?", message: `${outlet.outletName} akan dihapus dari pilihan surveyor.`, confirmLabel: "Hapus outlet", cancelLabel: "Batal", variant: "danger",
    onConfirm: async () => {
      try { await deleteOutlet(outlet.id); confirmStore.close(); toast.success("Outlet dihapus"); }
      catch (error) { confirmStore.close(); toast.error(error.message || "Outlet gagal dihapus"); }
    }, onCancel: () => confirmStore.close()
  });

  const downloadTemplate = () => {
    const csv = "nama_outlet,nama_pic,nama_toko,alamat,nomor_hp,email,latitude,longitude,status\r\n";
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "template-outlet.csv"; link.click(); URL.revokeObjectURL(url);
  };

  const handleBulkFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
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
    <div className="space-y-5">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-sm font-medium text-emerald-800">Master data</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Data outlet pelanggan</h1><p className="mt-1 text-sm text-slate-600">Sumber pilihan outlet pada formulir surveyor.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={downloadTemplate} className="min-h-11 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Unduh template</button><label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-emerald-700 bg-white px-4 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"><IconUpload className="h-4 w-4" />{importing ? "Mengimpor..." : "Bulk upload"}<input type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={handleBulkFile} disabled={importing} /></label><button type="button" onClick={openCreate} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"><IconPlus className="h-4 w-4" /> Tambah outlet</button></div></header>

      <div className="rounded-xl border border-slate-200 bg-white p-3"><label className="relative block"><span className="sr-only">Cari outlet</span><IconSearch className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama outlet, PIC, toko, alamat, atau email" className="min-h-11 w-full rounded-md border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20" /></label></div>

      {filtered.length === 0 ? <EmptyState Icon={IconBuilding} title={outlets.length ? "Outlet tidak ditemukan" : "Belum ada data outlet"} description={outlets.length ? "Ubah kata pencarian." : "Tambah manual atau unggah data menggunakan template."} action={!outlets.length && <button type="button" onClick={openCreate} className="min-h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white">Tambah outlet pertama</button>} /> : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="bg-slate-950 text-white"><tr><th className="px-4 py-3 font-semibold">Outlet dan toko</th><th className="px-4 py-3 font-semibold">PIC</th><th className="px-4 py-3 font-semibold">Kontak</th><th className="px-4 py-3 font-semibold">Alamat</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 text-right font-semibold">Aksi</th></tr></thead><tbody className="divide-y divide-slate-200">{filtered.map((outlet) => <tr key={outlet.id} className="align-top hover:bg-slate-50"><td className="px-4 py-4"><p className="font-semibold text-slate-950">{outlet.outletName}</p><p className="mt-0.5 text-slate-600">{outlet.storeName}</p>{outlet.isDemo && <span className="mt-2 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900">Data demo</span>}</td><td className="px-4 py-4 text-slate-700">{outlet.picName}</td><td className="px-4 py-4"><p className="text-slate-700">{outlet.phone}</p><p className="mt-1 text-slate-500">{outlet.email}</p></td><td className="max-w-xs px-4 py-4 text-slate-700">{outlet.address}</td><td className="px-4 py-4"><span className={`rounded px-2 py-1 text-xs font-semibold ${outlet.status === "aktif" ? "bg-emerald-100 text-emerald-900" : "bg-slate-200 text-slate-700"}`}>{outlet.status}</span></td><td className="px-4 py-4"><div className="flex justify-end gap-1.5"><button type="button" onClick={() => openEdit(outlet)} className="grid h-11 w-11 place-items-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100" aria-label={`Edit ${outlet.outletName}`}><IconEdit className="h-4 w-4" /></button><button type="button" onClick={() => handleDelete(outlet)} className="grid h-11 w-11 place-items-center rounded-md border border-red-200 text-red-700 hover:bg-red-50" aria-label={`Hapus ${outlet.outletName}`}><IconTrash className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div>
        </div>
      )}

      {showForm && <OutletDialog outlet={editing} onClose={() => setShowForm(false)} onSave={async (data) => {
        try {
          if (editing) { await updateOutlet(editing.id, data); toast.success("Outlet diperbarui"); }
          else { await addOutlet(data); toast.success("Outlet ditambahkan"); }
          setShowForm(false);
        } catch (error) {
          toast.error(error.message || "Outlet gagal disimpan");
          throw error;
        }
      }} />}
    </div>
  );
}

function OutletDialog({ outlet, onClose, onSave }) {
  const [form, setForm] = useState(outlet ? { ...outlet } : emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const firstRef = useRef(null);
  useEffect(() => { firstRef.current?.focus(); const key = (event) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, [onClose]);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="outlet-dialog-title"><div className="mx-auto my-4 w-full max-w-2xl rounded-xl bg-white p-5 shadow-xl"><div className="flex items-start justify-between"><div><h2 id="outlet-dialog-title" className="font-semibold">{outlet ? "Edit outlet" : "Tambah outlet"}</h2><p className="mt-1 text-sm text-slate-600">Semua data kontak utama wajib diisi.</p></div><button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-md hover:bg-slate-100" aria-label="Tutup dialog"><IconX className="h-5 w-5" /></button></div><form onSubmit={async (event) => { event.preventDefault(); setSubmitting(true); try { await onSave(form); } catch { /* feedback ditampilkan oleh parent */ } finally { setSubmitting(false); } }} className="mt-5 grid gap-4 sm:grid-cols-2"><Field refValue={firstRef} label="Nama outlet" value={form.outletName} setValue={(value) => set("outletName", value)} required /><Field label="Nama toko" value={form.storeName} setValue={(value) => set("storeName", value)} required /><Field label="Nama PIC" value={form.picName} setValue={(value) => set("picName", value)} required /><Field label="Nomor HP" value={form.phone} setValue={(value) => set("phone", value)} required /><Field label="Email" type="email" value={form.email} setValue={(value) => set("email", value)} required /><div><label className="mb-1.5 block text-sm font-medium">Status</label><select value={form.status} onChange={(event) => set("status", event.target.value)} className={fieldClass}><option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option></select></div><div className="sm:col-span-2"><Field label="Alamat" value={form.address} setValue={(value) => set("address", value)} required /></div><Field label="Latitude (opsional)" type="number" step="any" value={form.latitude} setValue={(value) => set("latitude", value)} /><Field label="Longitude (opsional)" type="number" step="any" value={form.longitude} setValue={(value) => set("longitude", value)} /><p className="text-xs leading-relaxed text-slate-600 sm:col-span-2">Koordinat outlet memungkinkan sistem menghitung jarak titik foto ke outlet. Verifikasi server tetap diperlukan untuk mitigasi spoofing tingkat lanjut.</p><div className="flex gap-2 pt-2 sm:col-span-2"><button type="button" onClick={onClose} disabled={submitting} className="min-h-11 flex-1 rounded-md border border-slate-300 text-sm font-semibold hover:bg-slate-50">Batal</button><button type="submit" disabled={submitting} className="min-h-11 flex-[2] rounded-md bg-emerald-700 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{submitting ? "Menyimpan..." : outlet ? "Simpan perubahan" : "Tambah outlet"}</button></div></form></div></div>;
}

function Field({ label, value, setValue, required, type = "text", step, refValue }) { return <div><label className="mb-1.5 block text-sm font-medium">{label}{required && <span className="text-red-700"> *</span>}</label><input ref={refValue} type={type} step={step} required={required} value={value} onChange={(event) => setValue(event.target.value)} className={fieldClass} /></div>; }
