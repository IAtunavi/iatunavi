import { useEffect, useState } from "react";
import { ImagePlus, Film, FileText, Sparkles, RefreshCw, Download, Trash2, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import { authHeaders, streamGenerate } from "@/lib/ai-context";
import { draftsStore, formatDate } from "@/lib/data";
import { uid } from "@/lib/persisted";
import { CardTitle, fieldClass, GlassCard, primaryButton } from "@/components/hud/primitives";

type Tab = "texto" | "imagem" | "video";
type SavedMedia = { id: string; type: "image" | "video"; prompt: string; url: string; createdAt: number };
type ApiError = { error?: string };
const HISTORY_KEY = "tunavi.media.history.v1";

function loadHistory(): SavedMedia[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is SavedMedia =>
      item && typeof item.id === "string" && (item.type === "image" || item.type === "video") &&
      typeof item.prompt === "string" && typeof item.url === "string" && typeof item.createdAt === "number"
    ) : [];
  } catch { return []; }
}

async function readApi<T extends ApiError>(response: Response): Promise<T> {
  const raw = await response.text();
  let data: T;
  try { data = (raw ? JSON.parse(raw) : {}) as T; }
  catch { throw new Error("O servidor retornou uma resposta inválida. Tente novamente."); }
  if (!response.ok) throw new Error(data.error || `Erro no servidor (${response.status}).`);
  return data;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function MediaCreator() {
  const [tab, setTab] = useState<Tab>("texto");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [duration, setDuration] = useState("5");
  const [busy, setBusy] = useState(false);
  const [textResult, setTextResult] = useState("");
  const [history, setHistory] = useState<SavedMedia[]>([]);
  const [mediaUrl, setMediaUrl] = useState("");

  useEffect(() => { setHistory(loadHistory()); }, []);

  const saveHistory = (items: SavedMedia[]) => {
    setHistory(items);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 30))); }
    catch { toast.error("O navegador não conseguiu salvar a galeria neste dispositivo."); }
  };

  const createText = async () => {
    if (prompt.trim().length < 3) { toast.error("Descreva o que deseja criar."); return; }
    setBusy(true); setTextResult("");
    try {
      const full = await streamGenerate({ mode: "criador", kind: "Texto", prompt }, setTextResult);
      draftsStore.set((items) => [{ id: uid(), kind: "Texto", brief: prompt.trim(), content: full, createdAt: Date.now() }, ...items]);
      toast.success("Texto criado e salvo.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível criar o texto."); }
    finally { setBusy(false); }
  };

  const createMedia = async () => {
    if (prompt.trim().length < 3) { toast.error("Descreva o que deseja criar."); return; }
    setBusy(true); setMediaUrl("");
    const mediaType = tab === "imagem" ? "image" : "video";
    try {
      const headers = { "content-type": "application/json", ...(await authHeaders()) };
      const post = async <T extends ApiError>(payload: object) => {
        const response = await fetch("/api/media", { method: "POST", headers, body: JSON.stringify(payload) });
        return readApi<T>(response);
      };
      const submitted = await post<{ requestId?: string }>({
        action: "submit", mediaType, prompt: prompt.trim(), aspectRatio, duration,
      });
      if (!submitted.requestId) throw new Error("A fal.ai não retornou o identificador da criação.");

      let completed = false;
      const deadline = Date.now() + 6 * 60 * 1000;
      while (Date.now() < deadline) {
        await wait(4000);
        const state = await post<{ status?: string }>({
          action: "status", mediaType, requestId: submitted.requestId,
        });
        const status = (state.status || "IN_QUEUE").toUpperCase();
        if (status === "COMPLETED") { completed = true; break; }
        if (status === "FAILED" || status === "CANCELLED") {
          throw new Error("A fal.ai não conseguiu concluir esta criação. Tente ajustar a descrição ou verificar os créditos da conta.");
        }
        if (status !== "IN_QUEUE" && status !== "IN_PROGRESS") {
          throw new Error(`Status inesperado retornado pela fal.ai: ${status}`);
        }
      }
      if (!completed) throw new Error("A criação excedeu o tempo de espera. Ela pode continuar na fila da fal.ai; tente consultar novamente mais tarde.");
      const output = await post<{ url?: string }>({
        action: "result", mediaType, requestId: submitted.requestId,
      });
      if (!output.url || !/^https:\/\//i.test(output.url)) throw new Error("A fal.ai concluiu o pedido, mas não retornou um arquivo válido.");
      setMediaUrl(output.url);
      saveHistory([{ id: uid(), type: mediaType, prompt: prompt.trim(), url: output.url, createdAt: Date.now() }, ...history]);
      toast.success(mediaType === "image" ? "Imagem criada!" : "Vídeo criado!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha na criação.");
    } finally { setBusy(false); }
  };

  const removeHistory = (id: string) => saveHistory(history.filter((item) => item.id !== id));
  const tabs: { id: Tab; label: string; icon: typeof FileText }[] = [
    { id: "texto", label: "Texto", icon: FileText },
    { id: "imagem", label: "Imagem", icon: ImagePlus },
    { id: "video", label: "Vídeo", icon: Film },
  ];

  return <div className="space-y-5">
    <GlassCard>
      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" onClick={() => { setTab(item.id); setMediaUrl(""); setTextResult(""); }} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] ring-1 transition ${tab === item.id ? "bg-vio/25 text-lav ring-vio/50" : "text-lav/55 ring-lav/15 hover:bg-lav/5"}`}><Icon className="h-4 w-4"/>{item.label}</button>; })}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <div className="space-y-3">
          <CardTitle>{tab === "texto" ? "O que vamos escrever?" : tab === "imagem" ? "Descreva a imagem" : "Descreva o vídeo"}</CardTitle>
          <textarea className={fieldClass + " min-h-36"} value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={2500} placeholder={tab === "texto" ? "Ex.: Crie uma apresentação profissional sobre inteligência artificial..." : tab === "imagem" ? "Ex.: Uma cidade futurista à noite, iluminação cinematográfica, detalhes roxos..." : "Ex.: Uma nave futurista sobrevoando uma cidade iluminada, câmera em movimento suave..."}/>
          {tab !== "texto" && <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[11px] text-lav/55">Proporção<select className={fieldClass + " mt-2"} value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)}><option value="16:9">16:9 · Paisagem</option><option value="1:1">1:1 · Quadrado</option><option value="9:16">9:16 · Vertical</option></select></label>
            {tab === "video" && <label className="text-[11px] text-lav/55">Duração<select className={fieldClass + " mt-2"} value={duration} onChange={(event) => setDuration(event.target.value)}><option value="5">5 segundos</option><option value="10">10 segundos</option></select></label>}
          </div>}
          <button type="button" className={primaryButton} disabled={busy} onClick={() => void (tab === "texto" ? createText() : createMedia())}>{busy ? <RefreshCw className="h-4 w-4 animate-spin"/> : <WandSparkles className="h-4 w-4"/>}{busy ? " Criando..." : tab === "texto" ? " Criar texto" : tab === "imagem" ? " Gerar imagem" : " Gerar vídeo"}</button>
          <p className="text-[10px] leading-5 text-lav/35">Imagens e vídeos usam créditos da fal.ai. O tempo e o custo variam conforme o modelo e a duração.</p>
        </div>
        <div className="min-h-64 rounded-2xl bg-ink/35 p-4 ring-1 ring-lav/10">
          <CardTitle aside={busy ? "processando" : mediaUrl || textResult ? "concluído" : "aguardando"}>Resultado</CardTitle>
          <div className="mt-4">
            {busy ? <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center text-[12px] text-lav/55"><RefreshCw className="h-6 w-6 animate-spin text-vio"/>A TUNAVI está criando seu conteúdo...</div>
              : tab === "imagem" && mediaUrl ? <img src={mediaUrl} alt={prompt} className="w-full rounded-xl object-contain"/>
              : tab === "video" && mediaUrl ? <video src={mediaUrl} controls className="w-full rounded-xl"/>
              : tab === "texto" && textResult ? <p className="whitespace-pre-wrap text-[12px] leading-6 text-lav/80">{textResult}</p>
              : <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center text-lav/30"><Sparkles className="h-8 w-8"/><p className="text-[12px]">Seu resultado aparecerá aqui.</p></div>}
          </div>
          {mediaUrl && <a href={mediaUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-[12px] text-lav/70 hover:text-lav"><Download className="h-4 w-4"/> Abrir ou baixar arquivo</a>}
        </div>
      </div>
    </GlassCard>
    <GlassCard>
      <CardTitle aside={`${history.length} arquivos`}>Galeria de criações</CardTitle>
      {history.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{history.map((item) => <div key={item.id} className="overflow-hidden rounded-xl bg-ink/30 ring-1 ring-lav/10">
        {item.type === "image" ? <img src={item.url} alt={item.prompt} className="aspect-video w-full object-cover"/> : <video src={item.url} controls className="aspect-video w-full object-cover"/>}
        <div className="p-3"><p className="line-clamp-2 text-[11px] text-lav/70">{item.prompt}</p><div className="mt-2 flex items-center justify-between"><span className="text-[10px] text-lav/35">{formatDate(item.createdAt)}</span><div className="flex gap-2"><a href={item.url} target="_blank" rel="noreferrer" aria-label="Abrir arquivo" className="text-lav/55 hover:text-lav"><Download className="h-4 w-4"/></a><button type="button" aria-label="Excluir da galeria" onClick={() => removeHistory(item.id)} className="text-lav/35 hover:text-red-300"><Trash2 className="h-4 w-4"/></button></div></div></div>
      </div>)}</div> : <p className="mt-4 text-[12px] text-lav/40">Suas imagens e vídeos criados aparecerão aqui.</p>}
    </GlassCard>
  </div>;
}
