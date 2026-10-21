import { redirect } from 'next/navigation';
import { BrandLogo } from '@/components/brand-logo';
import { LpMessage } from '@/components/lp-message';
import { safeNextPath } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { LoginForm } from './login-form';

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { next, error } = await searchParams;
  const nextPath = safeNextPath(next);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(nextPath);

  return (
    <main className="auth-page">
      <div className="auth-page__panel">
        <div className="auth-brand">
          <BrandLogo />
          <span>MiniDSP</span>
        </div>
        <section className="lp-card lp-card--elevated" aria-labelledby="login-title">
          <div className="lp-card__header">
            <div className="lp-card__title">
              <h1 className="heading-reset" id="login-title">
                Sign in to MiniDSP
              </h1>
            </div>
          </div>
          <div className="lp-card__body stack--tight">
            <p className="page-intro">Training-only data discovery for synthetic files.</p>
            {error === 'confirm' ? (
              <LpMessage variant="error" title="Confirmation link not valid">
                The link is invalid or has expired. Sign in if you already confirmed, or sign up again to get a new link.
              </LpMessage>
            ) : null}
            <LoginForm next={nextPath} />
            <p className="page-intro">
              New to MiniDSP?{' '}
              <a className="lp-link lp-link--inline" href="/signup">
                Create an account
              </a>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
