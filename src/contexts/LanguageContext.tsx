import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

type Lang = "en" | "ar";

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  dir: "ltr" | "rtl";
  isAr: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
  dir: "ltr",
  isAr: false,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem("platform-lang");
    return (saved === "ar" || saved === "en") ? saved : "en";
  });

  const dir = lang === "ar" ? "rtl" : "ltr";
  const isAr = lang === "ar";

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem("platform-lang", newLang);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
  }, [dir, lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, dir, isAr }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
