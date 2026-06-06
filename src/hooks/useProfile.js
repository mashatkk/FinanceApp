// src/hooks/useProfile.js
// Завантажує профіль користувача (включаючи валюту) з таблиці profiles.
// Використовується на будь-якій сторінці де потрібна валюта профілю.

import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient"; // ← скоригуй шлях

export default function useProfile() {
  const [profile, setProfile] = useState(null);  // { id, email, currency, ... }
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { if (!cancelled) setLoading(false); return; }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (!cancelled) {
        if (error) setError(error.message);
        else setProfile(data);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Зберігає зміну валюти
  const updateCurrency = async (currency) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await supabase
      .from("profiles")
      .update({ currency })
      .eq("id", session.user.id);
    if (!error) setProfile(p => ({ ...p, currency }));
    return error;
  };

  return { profile, loading, error, updateCurrency };
}
