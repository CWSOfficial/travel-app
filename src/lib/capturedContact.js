import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

// Cross-flow contact resolution for the conversational AI flows' auth gate.
// An authenticated Base44 session, or a previously-captured guest contact stored
// in localStorage, counts as "known" so the user is never asked twice within
// the new flows. (eSIM/Insurance keep their own ContactCaptureStep untouched.)
const KEY = "dheevoy_captured_contact";

export function getCapturedContact() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCapturedContact(name, email) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ name, email }));
  } catch {
    /* storage unavailable — ignore */
  }
}

// Returns { status: "checking" | "resolved" | "unknown", name, email, resolve }.
export function useResolvedContact() {
  const [state, setState] = useState({ status: "checking", name: null, email: null });

  useEffect(() => {
    let alive = true;
    base44.auth.me()
      .then((u) => {
        if (!alive) return;
        if (u?.email) { setState({ status: "resolved", name: u.full_name || "", email: u.email }); return; }
        const c = getCapturedContact();
        if (c?.email) { setState({ status: "resolved", name: c.name, email: c.email }); return; }
        setState({ status: "unknown" });
      })
      .catch(() => {
        if (!alive) return;
        const c = getCapturedContact();
        if (c?.email) { setState({ status: "resolved", name: c.name, email: c.email }); return; }
        setState({ status: "unknown" });
      });
    return () => { alive = false; };
  }, []);

  const resolve = (name, email) => {
    setCapturedContact(name, email);
    setState({ status: "resolved", name, email });
  };

  return { ...state, resolve };
}