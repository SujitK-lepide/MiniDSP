import { signOut } from '@/lib/auth/actions';

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button type="submit" className="lp-button lp-button--secondary lp-button--sm">
        Sign out
      </button>
    </form>
  );
}
