import { Link } from 'react-router-dom';
import { useT } from '../i18n/ui';

export default function NotFound() {
  const t = useT();
  return (
    <>
      <h2>{t('common.notFound')}</h2>
      <p><Link to="/">{t('common.backOverview')}</Link></p>
    </>
  );
}
