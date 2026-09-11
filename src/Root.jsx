import React, { useEffect, useState } from "react";
import { supabase, configured } from "./storage";
import Auth from "./Auth";
import App, { CSS } from "./App";
export default function Root() {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    if (!configured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  if (!configured) return <div className="afes" style={{ alignItems: "center", justifyContent: "center", padding: 20 }}><style>{CSS}</style><div className="panel" style={{ maxWidth: 480 }}><h2>Supabase isn't configured</h2><div className="muted" style={{ marginTop: 8 }}>Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to a .env file (or your host's environment variables), then rebuild. See README.md.</div></div></div>;
  if (session === undefined) return <div className="afes" style={{ alignItems: "center", justifyContent: "center" }}><style>{CSS}</style><span className="muted">Loading…</span></div>;
  if (!session) return <><style>{CSS}</style><Auth /></>;
  return <App user={session.user} onSignOut={() => supabase.auth.signOut()} />;
}
