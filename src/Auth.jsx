import React, { useState } from "react";
import { supabase } from "./storage";
export default function Auth() {
  const [email, setEmail] = useState(""); const [sent, setSent] = useState(false); const [err, setErr] = useState("");
  const send = async () => {
    setErr("");
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href.split("#")[0].split("?")[0] } });
    if (error) setErr(error.message); else setSent(true);
  };
  return (
    <div className="afes" style={{ alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="panel" style={{ width: "min(420px,100%)" }}>
        <h1 className="serif" style={{ fontSize: 30 }}>AI Filmmaker Evolution</h1>
        <div className="muted" style={{ margin: "6px 0 18px" }}>Sign in with a magic link. No password.</div>
        {sent ? <div>Check {email} for the link. Open it on this device.</div> : <>
          <input className="in" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} />
          <button className="btn pri" style={{ marginTop: 10, width: "100%", justifyContent: "center" }} onClick={send}>Send magic link</button>
          {err && <div style={{ color: "var(--red)", marginTop: 10, fontSize: 13 }}>{err}</div>}
        </>}
      </div>
    </div>
  );
}
