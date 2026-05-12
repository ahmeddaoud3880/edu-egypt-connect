import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslation, TranslationKey } from "@/i18n/translations";
import { useCallback } from "react";

export function useTranslation() {
  const { lang, dir, isAr, setLang } = useLanguage();

  const t = useCallback(
    (key: TranslationKey) => getTranslation(key, lang),
    [lang]
  );

  return { t, lang, dir, isAr, setLang };
}
