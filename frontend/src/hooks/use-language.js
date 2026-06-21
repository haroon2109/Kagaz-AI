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

  const [dynamicDict, setDynamicDict] = useState({});

  // Dynamic backend sync for translation dictionaries
  useEffect(() => {
    const fetchTranslations = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/v1/translations/${language}`);
        if (res.ok) {
          const remoteDict = await res.json();
          setDynamicDict(prev => ({...prev, [language]: remoteDict}));
        }
      } catch (err) {
        console.warn("Using offline fallback translations.");
      }
    };
    fetchTranslations();
  }, [language]);

  const t = (key) => {
    // 1. Check dynamic dictionary from LLM/Backend
    if (dynamicDict[language] && dynamicDict[language][key] !== undefined) {
      return dynamicDict[language][key];
    }
    // 2. Fallback to offline static dictionary
    if (translations[language] && translations[language][key] !== undefined) {
      return translations[language][key];
    }
    
    // 3. Ultimate fallback to English
    return translations.en[key] !== undefined ? translations.en[key] : key;
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
