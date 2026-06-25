import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Lang = 'en' | 'fr';

const STORAGE_KEY = 'morocco-cities-lang';

type LangContext = {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
};

const Ctx = createContext<LangContext | null>(null);

function initialLang(): Lang {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'fr') return saved;
  }
  return 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title =
      lang === 'fr'
        ? 'Villes du Maroc — Outil d’équilibre spatial'
        : 'Morocco Cities — Spatial Equilibrium Tool';
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang);
    }
  }, [lang]);

  const value = useMemo<LangContext>(
    () => ({
      lang,
      setLang: setLangState,
      toggle: () => setLangState((l) => (l === 'en' ? 'fr' : 'en')),
    }),
    [lang],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLang must be used within a LanguageProvider');
  return ctx;
}
