import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LockKeyhole, Mail, Sparkles, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { logActivity } from "@/lib/data";
import { GlassCard, PageContainer, fieldClass, primaryButton, pillButton } from "@/components/hud/primitives";

const MASTER_EMAIL = "tunavinetwork@gmail.com";

export const Route = createFileRoute("/entrar")({
  head: () => ({ meta: [{ title: "Entrar — TUNAVI" }, { name: "description", content: "Entre ou crie sua conta TUNAVI com autenticação segura." }] }),
  component: LoginPage,
});

function LoginPage() {
  const [mode,setMode]=useState<"login"|"signup"|"reset">("login");
  const [email,setEmail]=useState(MASTER_EMAIL);
  const [name,setName]=useState("");
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [busy,setBusy]=useState(false);
  const {user}=useAuth();
  const navigate=useNavigate();
  const submit=async(e:React.FormEvent)=>{e.preventDefault();if(busy)return;setBusy(true);try{
    const normalized=email.trim().toLowerCase();
    if(mode==="reset"){
      const {error}=await supabase.auth.resetPasswordForEmail(normalized,{redirectTo:window.location.origin+"/entrar"});
      if(error)throw error;toast.success("Se a conta existir, enviaremos as instruções de redefinição.");
    } else if(mode==="signup"){
      if(password.length<8)throw new Error("Use uma senha com pelo menos 8 caracteres.");
      if(password!==confirm)throw new Error("As senhas não coincidem.");
      const {data,error}=await supabase.auth.signUp({email:normalized,password,options:{data:{display_name:name.trim()||null},emailRedirectTo:window.location.origin+"/entrar"}});
      if(error)throw error;
      if(data.session){logActivity("Nova conta criada e autenticada.");toast.success("Conta criada. Bem-vindo à TUNAVI!");await navigate({to:"/"});}
      else toast.success("Cadastro recebido. Confirme seu e-mail para ativar a conta.");
    } else {
      const {error}=await supabase.auth.signInWithPassword({email:normalized,password});
      if(error)throw error;logActivity("Login realizado: "+normalized);toast.success("Acesso realizado.");await navigate({to:"/"});
    }
  }catch(err){toast.error(err instanceof Error?err.message:"Não foi possível concluir a solicitação.");}finally{setBusy(false);}};
  return <PageContainer className="flex min-h-[75vh] items-center justify-center">
    <GlassCard className="w-full max-w-md p-6 sm:p-8">
      <div className="mb-6 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-vio/20 text-lav ring-1 ring-vio/30"><Sparkles className="h-7 w-7"/></span><h1 className="mt-4 text-2xl font-semibold text-lav">Bem-vindo à TUNAVI</h1><p className="mt-1 text-[12px] text-lav/45">Sua inteligência. Seu mundo. Suas possibilidades.</p></div>
      {user?<div className="text-center"><p className="text-[13px] text-lav/70">Conectado como <strong>{user.email}</strong>.</p><Link to="/" className={primaryButton+" mt-5"}>Ir para o dashboard</Link></div>:<>
        <div className="mb-5 grid grid-cols-2 gap-2"><button type="button" className={mode==="login"?primaryButton:pillButton} onClick={()=>setMode("login")}>Entrar</button><button type="button" className={mode==="signup"?primaryButton:pillButton} onClick={()=>setMode("signup")}>Criar conta</button></div>
        {mode==="reset"&&<p className="mb-4 text-[12px] text-lav/55">Informe o e-mail da sua conta para receber o link seguro de redefinição.</p>}
        <form onSubmit={submit} className="space-y-3">
          {mode==="signup"&&<label className="block text-[11px] text-lav/55">Nome<input className={fieldClass+" mt-2"} autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="Como podemos chamar você?"/></label>}
          <label className="block text-[11px] text-lav/55">E-mail<div className="relative mt-2"><Mail className="absolute left-3 top-3 h-4 w-4 text-lav/35"/><input className={fieldClass+" pl-10"} type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@exemplo.com"/></div></label>
          {mode!=="reset"&&<label className="block text-[11px] text-lav/55">Senha<input className={fieldClass+" mt-2"} type="password" autoComplete={mode==="signup"?"new-password":"current-password"} minLength={mode==="signup"?8:1} required value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==="signup"?"Mínimo de 8 caracteres":"Sua senha"}/></label>}
          {mode==="signup"&&<label className="block text-[11px] text-lav/55">Confirmar senha<input className={fieldClass+" mt-2"} type="password" autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repita sua senha"/></label>}
          <button className={primaryButton+" w-full"} disabled={busy}>{mode==="signup"?<UserPlus className="h-4 w-4"/>:mode==="reset"?<Mail className="h-4 w-4"/>:<LockKeyhole className="h-4 w-4"/>}{busy?"Processando...":mode==="signup"?"Criar conta":mode==="reset"?"Enviar link seguro":"Entrar com segurança"}</button>
        </form>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px]"><button className="text-lav/50 hover:text-lav" onClick={()=>setMode(mode==="reset"?"login":"reset")}>{mode==="reset"?"Voltar ao login":"Esqueci minha senha"}</button>{mode==="login"&&<span className="text-lav/35">Conta mestre pré-selecionada</span>}</div>
        <p className="mt-5 text-center text-[10px] leading-5 text-lav/35">A conta mestre usa o e-mail {MASTER_EMAIL}, mas precisa autenticar com a senha cadastrada no Supabase. O cadastro não concede privilégios administrativos automaticamente.</p>
      </>}
    </GlassCard>
  </PageContainer>;
}
