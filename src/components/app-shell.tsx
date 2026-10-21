import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/brand-logo';
import { SignOutButton } from '@/components/sign-out-button';

export type NavKey = 'dashboard' | 'upload' | 'findings';

const NAV: ReadonlyArray<{ key: NavKey; href: string; label: string; icon: ReactNode }> = [
  {
    key: 'dashboard',
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <path d="M4 4H10V12H4V4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 16H10V20H4V16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 12H20V20H14V12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 4H20V8H14V4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'upload',
    href: '/upload',
    label: 'Upload',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <path d="M12 16V4M7 9l5-5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 16v4h16v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'findings',
    href: '/findings',
    label: 'Findings',
    icon: (
      <svg viewBox="0 0 30 30" fill="none" aria-hidden="true" focusable="false">
        <path
          d="M5 15H5.0125M5 7.5H5.0125M5 22.5H5.0125M10 22.5H12.5M10 15H12.5M10 7.5H12.5M17.5 7.5H25M17.5 15H25M17.5 22.5H25"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

/** App Shell pattern (design.md §6): lp-sidebar rail + breadcrumb/title header + content. */
export function AppShell({
  active,
  title,
  intro,
  email,
  children,
}: {
  active: NavKey;
  title: string;
  intro?: string;
  email: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <nav className="lp-sidebar" aria-label="Primary" style={{ width: '100px' }}>
        <div className="lp-sidebar__header">
          <BrandLogo size={40} />
        </div>
        <ul className="lp-sidebar__items">
          {NAV.map((item) => (
            <li key={item.key}>
              <a
                href={item.href}
                className={item.key === active ? 'lp-sidebar__item lp-sidebar__item--active' : 'lp-sidebar__item'}
                aria-current={item.key === active ? 'page' : undefined}
              >
                <span className="lp-sidebar__icon-box">{item.icon}</span>
                <span className="lp-sidebar__label">{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <main className="app-main">
        <header className="page-header">
          <div className="page-header__titles">
            <nav className="lp-breadcrumb" aria-label="Breadcrumb">
              <ol className="lp-breadcrumb__list">
                <li className="lp-breadcrumb__item">
                  <a className="lp-breadcrumb__link" href="/dashboard">
                    MiniDSP
                  </a>
                  <span className="lp-breadcrumb__separator" aria-hidden="true">
                    /
                  </span>
                </li>
                <li className="lp-breadcrumb__item">
                  <span className="lp-breadcrumb__current" aria-current="page">
                    {title}
                  </span>
                </li>
              </ol>
            </nav>
            <h1 className="page-title">{title}</h1>
            {intro ? <p className="page-intro">{intro}</p> : null}
          </div>
          <div className="page-header__account">
            {email ? <span>Signed in as {email}</span> : null}
            <SignOutButton />
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
