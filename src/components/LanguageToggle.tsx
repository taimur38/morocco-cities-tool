import { useLang, type Lang } from '../i18n/context';
import { useT } from '../i18n/ui';

const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
];

// Segmented FR/EN switch in the header. Restrained, monospace, matches the nav.
export default function LanguageToggle() {
  const { lang, setLang } = useLang();
  const t = useT();
  return (
    <div className="lang-toggle" role="group" aria-label={t('header.switchLang')}>
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          className={l.code === lang ? 'active' : ''}
          aria-pressed={l.code === lang}
          onClick={() => setLang(l.code)}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
