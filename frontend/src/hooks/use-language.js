"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { translations } from "@/lib/translations";

const LanguageContext = createContext({
  language: "en",
  setLanguage: () => {},
  t: (key) => "",
  toggleLanguage: () => {},
});

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState("en");

  // Load saved preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("kagaz_pref_lang");
    if (saved === "en" || saved === "hi") {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang) => {
    if (lang === "en" || lang === "hi") {
      setLanguageState(lang);
      localStorage.setItem("kagaz_pref_lang", lang);
    }
  };

  const toggleLanguage = () => {
    const nextLang = language === "en" ? "hi" : "en";
    setLanguage(nextLang);
  };

  const t = (key) => {
    const dict = translations[language] || translations.en;
    return dict[key] !== undefined ? dict[key] : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
