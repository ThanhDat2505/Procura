import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/brand/Logo';
import { ButtonLink, EmptyState } from '@/components/ui';

export function NotFoundPage() {
  const { t } = useTranslation('layout');
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6">
      <Logo className="h-10" />
      <EmptyState
        icon="travel_explore"
        title={t('notFound.title')}
        description={t('notFound.description')}
        action={
          <ButtonLink to="/" leftIcon="home">
            {t('notFound.home')}
          </ButtonLink>
        }
      />
    </div>
  );
}
