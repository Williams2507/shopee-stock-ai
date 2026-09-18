"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) window.location.replace("/");
    });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) window.location.href = "/";
        else setMessage("Conta criada. Confira seu e-mail para confirmar o cadastro.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = "/";
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível continuar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#08090c] text-white grid lg:grid-cols-2">
      <section className="hidden lg:flex p-12 border-r border-white/5 flex-col justify-between bg-[#0d0e13]">
        <div className="font-bold text-lg">Shopee Stock AI</div>
        <div className="max-w-xl">
          <div className="inline-flex px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-300 text-xs font-semibold mb-5">
            Estoque inteligente para Shopee
          </div>
          <h1 className="text-5xl font-bold leading-tight">Decisões de estoque com dados, não no chute.</h1>
          <p className="text-zinc-400 text-lg mt-5">Acompanhe vendas, risco de ruptura, demanda, reposição e avaliações em um único painel.</p>
        </div>
        <p className="text-xs text-zinc-600">Shopee Stock AI</p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden font-bold text-lg mb-10">Shopee Stock AI</div>
          <p className="text-sm text-orange-300 font-semibold">{mode === "login" ? "Bem-vindo de volta" : "Comece agora"}</p>
          <h2 className="text-3xl font-bold mt-2">{mode === "login" ? "Entre na sua conta" : "Crie sua conta"}</h2>
          <p className="text-zinc-500 mt-2">{mode === "login" ? "Acesse o painel da sua operação." : "Use seu e-mail para criar o acesso ao SaaS."}</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <label className="block">
              <span className="text-sm text-zinc-400">E-mail</span>
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none focus:border-orange-400/50" placeholder="voce@email.com" />
            </label>
            <label className="block">
              <span className="text-sm text-zinc-400">Senha</span>
              <input type="password" required minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none focus:border-orange-400/50" placeholder="Mínimo de 6 caracteres" />
            </label>
            {message && <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3 text-sm text-zinc-300">{message}</div>}
            <button disabled={loading} className="w-full rounded-xl bg-orange-500 px-4 py-3 font-bold text-white hover:bg-orange-400 disabled:opacity-60 transition">
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setMessage(""); }} className="w-full mt-4 text-sm text-zinc-400 hover:text-white transition">
            {mode === "login" ? "Ainda não tem conta? Criar cadastro" : "Já tem conta? Entrar"}
          </button>
        </div>
      </section>
    </main>
  );
}
