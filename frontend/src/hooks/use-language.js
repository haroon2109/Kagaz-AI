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
    const langs = ["en", "hi", "ta", "ml", "te", "ur"];
    const saved = localStorage.getItem("kagaz_pref_lang");
    if (langs.includes(saved)) {
      setLanguageState(saved);
    }
  }, []);

  const langs = ["en", "hi", "ta", "ml", "te", "ur"];

  const setLanguage = (lang) => {
    if (langs.includes(lang)) {
      setLanguageState(lang);
      localStorage.setItem("kagaz_pref_lang", lang);
    }
  };

  const toggleLanguage = () => {
    const currentIndex = langs.indexOf(language);
    const nextLang = langs[(currentIndex + 1) % langs.length];
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
