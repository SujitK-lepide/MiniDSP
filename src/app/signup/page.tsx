import { redirect } from 'next/navigation';
import { BrandLogo } from '@/components/brand-logo';
import { createClient } from '@/lib/supabase/server';
import { SignupForm } from './signup-form';

export default async function SignupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  return (
    <main className="auth-page">
      <div className="auth-page__panel">
        <div className="auth-brand">
          <BrandLogo />
          <span>MiniDSP</span>
        </div>
        <section className="lp-card lp-card--elevated" aria-labelledby="signup-title">
          <div className="lp-card__header">
            <div className="lp-card__title">
              <h1 className="heading-reset" id="signup-title">
                Create your MiniDSP account
              </h1>
            </div>
          </div>
          <div className="lp-card__body stack--tight">
            <p className="page-intro">Training-only: upload synthetic files, never real personal data.</p>
            <SignupForm />
            <p className="page-intro">
              Already have an account?{' '}
              <a className="lp-link lp-link--inline" href="/login">
                Sign in
              </a>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
