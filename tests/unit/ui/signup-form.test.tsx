import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const signUp = vi.fn();
vi.mock('@/lib/auth/actions', () => ({ signUp: (...args: unknown[]) => signUp(...args) }));

import { SignupForm } from '@/app/signup/signup-form';

beforeEach(() => signUp.mockReset());

describe('SignupForm', () => {
  it('renders labelled email, password and confirm fields with a helper', () => {
    render(<SignupForm />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByLabelText('Confirm password')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('At least 8 characters.');
  });

  it('shows server field errors linked to the inputs', async () => {
    signUp.mockResolvedValue({
      status: 'error',
      message: null,
      fieldErrors: { email: 'Enter a valid email address, e.g. name@example.com.', confirm: 'The passwords do not match.' },
    });
    render(<SignupForm />);
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    const email = await screen.findByLabelText('Email');
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription(/valid email address/);
    expect(screen.getByLabelText('Confirm password')).toHaveAccessibleDescription('The passwords do not match.');
  });

  it('shows a general error message', async () => {
    signUp.mockResolvedValue({ status: 'error', message: 'An account with this email already exists. Sign in instead.', fieldErrors: {} });
    render(<SignupForm />);
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('already exists');
  });

  it('replaces the form with a "check your email" message', async () => {
    signUp.mockResolvedValue({ status: 'check-email', message: null, fieldErrors: {} });
    render(<SignupForm />);
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Check your email');
    expect(screen.queryByLabelText('Password')).toBeNull();
    expect(screen.getByRole('link', { name: 'Go to sign in' })).toHaveAttribute('href', '/login');
  });
});
