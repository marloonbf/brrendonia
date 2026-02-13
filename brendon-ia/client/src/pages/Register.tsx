import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState<string>("");

  async function onRegister() {
    setMsg("");
    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: { full_name: name },
      },
    });

    if (error) setMsg(error.message);
    else setMsg("Conta criada! Agora faça login.");
  }

  return (
    <div style={{ padding: 24, fontFamily: "Arial", maxWidth: 420 }}>
      <h2>Criar conta</h2>

      <input
        placeholder="Nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 10 }}
      />
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 10 }}
      />
      <input
        placeholder="Senha"
        type="password"
        value={pass}
        onChange={(e) => setPass(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 10 }}
      />

      <button onClick={onRegister} style={{ padding: 10, width: "100%" }}>
        Criar conta
      </button>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </div>
  );
}
