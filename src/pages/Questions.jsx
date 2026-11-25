import { useEffect, useState } from "react";
import { useStore } from "../lib/store";
import { supabase } from "../lib/supabase";
import { toast } from "../lib/toast";
import { Plus, Trash2, Pencil, Loader2, ListChecks, CheckSquare, Type } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function Questions() {
  const { questions = [], addQuestion, updateQuestion, deleteQuestion, fetchQuestions } = useStore();
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [busy, setBusy] = useState(false);
  
  // Form State
  const [text, setText] = useState("");
  const [type, setType] = useState("text");
  const [options, setOptions] = useState([]);
  const [newOption, setNewOption] = useState("");

  // Real-time listener (Optional, memastikan data sinkron jika dibuka di 2 tab)
  useEffect(() => {
    fetchQuestions?.();
    if (!supabase) return;
    const channel = supabase.channel('questions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'survey_questions' }, () => {
        fetchQuestions?.();
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchQuestions]);

  const openForm = (q = null) => {
    if (q) {
      setEditingId(q.id);
      setText(q.text); // Perbaikan: q.text
      setType(q.type); // Perbaikan: q.type
      setOptions(q.options || []);
    } else {
      setEditingId(null);
      setText("");
      setType("text");
      setOptions([]);
    }
    setNewOption("");
    setFormOpen(true);
  };

  const handleAddOption = () => {
    if (!newOption.trim()) return;
    setOptions([...options, newOption.trim()]);
    setNewOption("");
  };

  const handleRemoveOption = (index) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (type === "choice" && options.length < 2) {
      return toast.error("Pilihan ganda wajib memiliki minimal 2 opsi.");
    }
    setBusy(true);
    const payload = {
      text: text,
      type: type,
      options: type === "choice" ? options : []
    };
    try {
      if (editingId) await updateQuestion(editingId, payload);
      else await addQuestion({ ...payload, orderIndex: questions.length + 1 });
      toast.success("Pertanyaan berhasil disimpan");
      setFormOpen(false);
    } catch (error) {
      toast.error(error.message || "Gagal menyimpan pertanyaan");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await deleteQuestion(deletingId);
      toast.success("Pertanyaan dihapus");
      setDeletingId(null);
    } catch (error) {
      toast.error(error.message || "Gagal menghapus");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 animate-in fade-in duration-300">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-emerald-700">Master data</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Kelola Pertanyaan Survei</h1>
          <p className="text-sm text-slate-600">Atur daftar pertanyaan yang akan diisi oleh surveyor di lapangan.</p>
        </div>
        <Button onClick={() => openForm()} className="h-11 bg-emerald-700 hover:bg-emerald-800">
          <Plus className="mr-2 size-4" /> Tambah Pertanyaan
        </Button>
      </header>

      <div className="space-y-3">
        {questions.map((q, index) => (
          <Card key={q.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-md bg-slate-100 font-semibold text-slate-600">
                {index + 1}
              </div>
              <div>
                <p className="font-medium text-slate-900">{q.text}</p> {/* Perbaikan: q.text */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs bg-slate-50">
                    {q.type === 'text' ? <><Type className="mr-1 size-3"/> Teks Bebas</> : 
                     q.type === 'boolean' ? <><CheckSquare className="mr-1 size-3"/> Ya / Tidak</> : 
                     <><ListChecks className="mr-1 size-3"/> Pilihan Ganda</>}
                  </Badge>
                  {q.type === 'choice' && (
                    <span className="text-xs text-slate-500">{q.options?.length || 0} Opsi</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button variant="outline" size="icon" onClick={() => openForm(q)} className="h-9 w-9">
                <Pencil className="size-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setDeletingId(q.id)} className="h-9 w-9 text-red-600 hover:bg-red-50">
                <Trash2 className="size-4" />
              </Button>
            </div>
          </Card>
        ))}
        {questions.length === 0 && (
          <div className="rounded-xl border border-dashed p-8 text-center text-slate-500">
            Belum ada pertanyaan. Klik "Tambah Pertanyaan" untuk memulai.
          </div>
        )}
      </div>

      {/* MODAL FORM */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Pertanyaan" : "Tambah Pertanyaan"}</DialogTitle>
              <DialogDescription>Pilih tipe pertanyaan sesuai kebutuhan data.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label>Teks Pertanyaan</Label>
                <Input required value={text} onChange={(e) => setText(e.target.value)} placeholder="Contoh: Apakah kebersihan outlet terjaga?" className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label>Tipe Jawaban</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Teks Bebas (Textarea)</SelectItem>
                    <SelectItem value="boolean">Ya / Tidak (Pilihan Tunggal)</SelectItem>
                    <SelectItem value="choice">Pilihan Ganda (Custom Opsi)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {type === "choice" && (
                <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <Label>Opsi Pilihan</Label>
                  <div className="flex gap-2">
                    <Input value={newOption} onChange={(e) => setNewOption(e.target.value)} placeholder="Ketik opsi baru..." className="h-10 bg-white" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())} />
                    <Button type="button" variant="secondary" onClick={handleAddOption} className="h-10">Tambah</Button>
                  </div>
                  <ul className="space-y-2 mt-2">
                    {options.map((opt, i) => (
                      <li key={i} className="flex items-center justify-between rounded-md bg-white border px-3 py-2 text-sm">
                        <span>{opt}</span>
                        <button type="button" onClick={() => handleRemoveOption(i)} className="text-red-500 hover:text-red-700"><Trash2 className="size-4" /></button>
                      </li>
                    ))}
                    {options.length === 0 && <p className="text-xs text-slate-500 text-center">Belum ada opsi.</p>}
                  </ul>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Batal</Button>
              <Button type="submit" disabled={busy} className="bg-emerald-700">{busy ? "Menyimpan..." : "Simpan"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ALERT DELETE */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus pertanyaan ini?</AlertDialogTitle>
            <AlertDialogDescription>Pertanyaan akan dihapus dari form surveyor. Data jawaban lama tetap tersimpan di database.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete(); }} className="bg-red-600">{busy ? "Menghapus..." : "Hapus"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}