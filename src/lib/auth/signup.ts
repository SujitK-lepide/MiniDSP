export type SignupInput = { email: string; password: string; confirm: string };

export type SignupFieldErrors = Partial<Record<keyof SignupInput, string>>;

export const PASSWORD_MIN = 8;
/** bcrypt (Supabase Auth) only uses the first 72 bytes; reject longer passwords instead of silently truncating. */
export const PASSWORD_MAX_BYTES = 72;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateSignup({ email, password, confirm }: SignupInput): SignupFieldErrors {
  const errors: SignupFieldErrors = {};
  if (!email) errors.email = 'Enter your email address.';
  else if (email.length > 254 || !EMAIL.test(email)) errors.email = 'Enter a valid email address, e.g. name@example.com.';

  const bytes = new TextEncoder().encode(password).byteLength;
  if (!password) errors.password = 'Choose a password.';
  else if (password.length < PASSWORD_MIN) errors.password = `Use at least ${PASSWORD_MIN} characters.`;
  else if (bytes > PASSWORD_MAX_BYTES) errors.password = `Use at most ${PASSWORD_MAX_BYTES} bytes (about 72 characters).`;

  if (!confirm) errors.confirm = 'Re-enter your password.';
  else if (password && confirm !== password) errors.confirm = 'The passwords do not match.';
  return errors;
}

/** Safe, user-facing messages for Supabase Auth sign-up errors (never the raw server text). */
export function signupErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'email_exists':
    case 'user_already_exists':
      return 'An account with this email already exists. Sign in instead.';
    case 'weak_password':
      return 'Choose a stronger password: longer, and not a common password.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Too many sign-up attempts. Wait a few minutes and try again.';
    case 'signup_disabled':
    case 'email_provider_disabled':
      return 'New sign-ups are turned off for this workspace. Ask an administrator for an account.';
    case 'email_address_invalid':
    case 'email_address_not_authorized':
      return 'This email address cannot be used. Try a different address.';
    default:
      return 'The account could not be created. Try again in a moment.';
  }
}
