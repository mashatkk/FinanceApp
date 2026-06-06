// src/hooks/useCurrencyRates.js
// Підтягує курси валют відносно UAH через open.er-api.com (безкоштовно, без ключа).
// Кешує в localStorage на 1 годину.

import { useState, useEffect } from "react";

const CACHE_KEY = "fin_rates_v1";
const CACHE_TTL = 60 * 60 * 1000; // 1 година

export const CURRENCIES = [
  { code: "UAH", symbol: "грн", label: "Гривня"           },
  { code: "USD", symbol: "$",   label: "Долар США"         },
  { code: "EUR", symbol: "€",   label: "Євро"              },
  { code: "GBP", symbol: "£",   label: "Фунт стерлінгів"  },
  { code: "PLN", symbol: "zł",  label: "Злотий"            },
];

// Статичний fallback якщо API недоступне
const FALLBACK = { UAH: 1, USD: 41.5, EUR: 44.8, GBP: 52.3, PLN: 10.2 };

// Скільки UAH за 1 одиницю валюти
export const toUAH = (amount, fromCurrency, rates) => {
  if (!rates || fromCurrency === "UAH") return Number(amount);
  return Number(amount) * (rates[fromCurrency] ?? FALLBACK[fromCurrency] ?? 1);
};

// Скільки targetCurrency за amount грн
export const fromUAH = (amountUAH, toCurrency, rates) => {
  if (!rates || toCurrency === "UAH") return Number(amountUAH);
  const rate = rates[toCurrency] ?? FALLBACK[toCurrency] ?? 1;
  return Number(amountUAH) / rate;
};

// Форматує з символом валюти
export const fmtWithCurrency = (amount, currency = "UAH") => {
  const cur = CURRENCIES.find(c => c.code === currency);
  const n = new Intl.NumberFormat("uk-UA", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  if (currency === "UAH") return `${n} грн`;
  return `${cur?.symbol ?? currency}${n}`;
};

export default function useCurrencyRates() {
  const [rates,   setRates]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      // 1. Перевіряємо кеш
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
        if (cached && Date.now() - cached.ts < CACHE_TTL) {
          if (!cancelled) { setRates(cached.rates); setLoading(false); }
          return;
        }
      } catch { /* ignore */ }

      // 2. Запит: base=UAH → отримуємо скільки одиниць інших валют за 1 грн
      try {
        const res  = await fetch("https://open.er-api.com/v6/latest/UAH");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        // json.rates = { USD: 0.0241, EUR: 0.0223, ... } — валют за 1 UAH
        // Нам треба навпаки: UAH за 1 одиницю валюти
        const ratesUAH = { UAH: 1 };
        CURRENCIES.forEach(({ code }) => {
          if (code === "UAH") return;
          ratesUAH[code] = json.rates[code] ? 1 / json.rates[code] : FALLBACK[code];
        });
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), rates: ratesUAH }));
        if (!cancelled) { setRates(ratesUAH); setLoading(false); }
      } catch {
        if (!cancelled) {
          setRates(FALLBACK);
          setError("Курси з кешу (API недоступне)");
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return { rates, loading, error };
}
