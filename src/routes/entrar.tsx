import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LockKeyhole, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { GlassCard, PageContainer, fieldClass, primaryButton } from "@/components/hud/primitives";

export const Route = createFileRoute("/entrar")({
  head: () => ({ meta: [{ title: "Entrar — TUNAVI" }, { name: "description", content: "Acesse sua conta TUNAVI." }] }),
  component: LoginPage,
});

function LoginPage() {
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [busy,setBusy]=useState(false);
  const {user}=useAuth(); const navigate=useNavigate();
  const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);try{const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error)throw error;toast.success("Acesso realizado.");await navigate({to:"/"});}catch(err){toast.error(err instanceof Error?err.message:"Não foi possível entrar.");}finally{setBusy(false);}};
  return <PageContainer className="flex min-h-[75vh] items-center justify-center"><GlassCard className="w-full max-w-md p-7"><div className="mb-6 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-vio/20 text-lav"><Sparkles className="h-7 w-7"/></span><h1 className="mt-4 text-2xl font-semibold text-lav">Bem-vindo à TUNAVI</h1><p className="mt-1 text-[12px] text-lav/45">Entre para continuar no seu espaço inteligente.</p></div>{user?<div className="text-center"><p className="text-[13px] text-lav/70">Você já está conectado como {user.email}.</p><Link to="/" className={primaryButton+" mt-5"}>Ir para a visão geral</Link></div>:<form onSubmit={submit} className="space-y-4"><label className="block text-[11px] text-lav/55">E-mail<input className={fieldClass+" mt-2"} type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@exemplo.com"/></label><label className="block text-[11px] text-lav/55">Senha<input className={fieldClass+" mt-2"} type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Sua senha"/></label><button className={primaryButton+" w-full"} disabled={busy}><LockKeyhole className="h-4 w-4"/>{busy?"Verificando...":"Entrar com segurança"}</button><p className="text-center text-[10px] leading-5 text-lav/35">A autenticação é processada pelo Supabase. Não compartilhe sua senha nem a armazene no código.</p></form>}</GlassCard></PageContainer>;
}
