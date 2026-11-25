import { useStore } from "../lib/store";
import { LogOut, ShieldCheck, Mail, Fingerprint, User as UserIcon } from "lucide-react";

// Shadcn UI
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function Profile() {
  const { user, logout } = useStore();

  // Fallback in case user object is briefly undefined
  const initial = user?.nama ? user.nama[0].toUpperCase() : "U";
  const roleText = user?.role === "master" ? "Master" : "Surveyor";

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <header className="space-y-1">
        <p className="text-sm font-medium text-emerald-700">Akun</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Profil Pengguna</h1>
        <p className="text-sm text-slate-600">Identitas yang tercatat pada laporan dan log sistem.</p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4 pb-4">
          <Avatar className="size-16 sm:size-20">
            <AvatarFallback className="bg-emerald-100 text-2xl font-bold text-emerald-900">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <CardTitle className="text-xl">{user?.nama || "Pengguna"}</CardTitle>
            <CardDescription className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
              <ShieldCheck className="size-4" />
              {roleText}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Separator />
          
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Mail className="size-3.5" /> Email
              </dt>
              <dd className="text-sm font-medium text-slate-900 break-all">{user?.email}</dd>
            </div>
            <div className="space-y-1">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Fingerprint className="size-3.5" /> ID Akun
              </dt>
              <dd className="text-sm font-mono font-medium text-slate-900 break-all">{user?.id}</dd>
            </div>
          </dl>

          <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <ShieldCheck className="mt-0.5 size-5 flex-none text-emerald-700" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Keamanan akun</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Sesi dan hak akses data dikelola berdasarkan peran pengguna di dalam sistem. Pastikan Anda selalu keluar setelah menggunakan perangkat bersama.
              </p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={logout} 
            className="w-full h-11 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 sm:w-auto"
          >
            <LogOut className="mr-2 size-4" /> 
            Keluar dari Akun
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}