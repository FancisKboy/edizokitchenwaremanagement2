
'use client';

import { FormEvent, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Unable to sign in. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-3 py-4 sm:px-5 sm:py-5">
      {/* Background decoration */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-32 h-72 w-72 rounded-full bg-slate-300/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-slate-400/15 blur-3xl"
      />

      <div className="relative mx-auto grid w-full max-w-6xl overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-[0_20px_60px_-25px_rgba(7,27,73,0.30)] lg:grid-cols-[1.02fr_0.98fr]">
        {/* Brand panel */}
        <section className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#071B49] via-[#0C2D68] to-[#071B49] px-6 py-6 text-white sm:px-8 sm:py-7 lg:px-10 lg:py-8">
          {/* Decorative shapes */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full border border-white/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full border border-white/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 -left-16 h-64 w-64 rounded-full bg-slate-800/30 blur-2xl"
          />

          {/* Logo and brand */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-lg shadow-slate-950/20 sm:h-14 sm:w-14">
              <Image
                src="/edizokitchenware-icon.png"
                alt="Edizokitchenware logo"
                width={52}
                height={52}
                priority
                className="h-full w-full object-contain"
              />
            </div>

            <div>
              <p className="text-base font-extrabold tracking-tight sm:text-lg">
                Edizo<span className="text-slate-300">kitchenware</span>
              </p>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-300 sm:text-[10px]">
                Management System
              </p>
            </div>
          </div>

          {/* Main brand message */}
          <div className="relative z-10 mt-7 lg:mt-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-[10px] font-semibold text-slate-200 backdrop-blur-sm sm:text-xs">
              <span className="h-2 w-2 rounded-full bg-slate-300" />
              BUSINESS MANAGEMENT PLATFORM
            </div>

            <h1 className="max-w-lg text-3xl font-extrabold leading-[1.12] tracking-tight sm:text-4xl lg:text-[40px]">
              Manage your business.
              <span className="mt-2 block text-slate-300">
                Move forward with confidence.
              </span>
            </h1>

            <p className="mt-4 max-w-md text-sm leading-6 text-slate-300 sm:leading-7">
              One organized place to manage your kitchenware products,
              inventory, purchases, sales, customers, debts and profit.
            </p>

            {/* Feature cards */}
            <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-slate-200">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" />
                    <path d="m4.5 7.5 7.5 4.3 7.5-4.3M12 12v9" />
                  </svg>
                </div>
                <p className="text-sm font-bold">Inventory</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Track stock and batches
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-slate-200">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="M3 17 9 11l4 4 8-9" />
                    <path d="M15 6h6v6" />
                    <path d="M4 21h16" />
                  </svg>
                </div>
                <p className="text-sm font-bold">Profit</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Understand your results
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-slate-200">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <circle cx="9" cy="8" r="3.5" />
                    <path d="M2.5 20v-1.5A5.5 5.5 0 0 1 8 13h2a5.5 5.5 0 0 1 5.5 5.5V20" />
                    <path d="M16 4.8a3.5 3.5 0 0 1 0 6.7M17 13.5a5.5 5.5 0 0 1 4.5 5.4V20" />
                  </svg>
                </div>
                <p className="text-sm font-bold">Customers</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Follow payments and debts
                </p>
              </div>
            </div>
          </div>

          {/* Brand footer */}
          <div className="relative z-10 mt-6 flex items-center justify-between gap-3 border-t border-white/15 pt-4">
            <p className="text-[11px] text-slate-400 sm:text-xs">
              Organized business. Clear decisions.
            </p>
            <span className="shrink-0 rounded-full border border-white/15 px-2.5 py-1 text-[9px] font-semibold tracking-wider text-slate-200">
              VERSION 1.0
            </span>
          </div>
        </section>

        {/* Login panel */}
        <section className="flex items-center justify-center bg-white px-5 py-7 sm:px-8 sm:py-8 lg:px-10 xl:px-12">
          <div className="w-full max-w-md">
            {/* Small brand identifier */}
            <div className="mb-6 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                <Image
                  src="/edizokitchenware-icon.png"
                  alt=""
                  width={30}
                  height={30}
                  className="h-7 w-7 object-contain"
                />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0C2D68]">
                  Secure access
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Your business workspace
                </p>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Welcome back<span className="text-[#0C2D68]">.</span>
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
                Sign in to continue to your dashboard.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Email address
                </label>

                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <rect x="3" y="5" width="18" height="14" rx="3" />
                      <path d="m4 7 8 6 8-6" />
                    </svg>
                  </span>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter your email"
                    autoComplete="email"
                    required
                    className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 pl-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-[#0C2D68] focus:bg-white focus:ring-4 focus:ring-[#0C2D68]/10"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Password
                </label>

                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <rect x="4" y="10" width="16" height="11" rx="2.5" />
                      <path d="M8 10V7a4 4 0 1 1 8 0v3" />
                      <path d="M12 14v3" />
                    </svg>
                  </span>

                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 pl-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-[#0C2D68] focus:bg-white focus:ring-4 focus:ring-[#0C2D68]/10"
                  />
                </div>
              </div>

              {/* Login error */}
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="mt-0.5 h-5 w-5 shrink-0"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v5M12 16.5h.01" />
                  </svg>
                  <p>{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#071B49] to-[#0C2D68] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition duration-200 hover:-translate-y-0.5 hover:from-[#061538] hover:to-[#071B49] hover:shadow-xl hover:shadow-slate-900/25 focus:outline-none focus:ring-4 focus:ring-slate-500/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {loading ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="opacity-25"
                      />
                      <path
                        d="M21 12a9 9 0 0 0-9-9"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        className="opacity-90"
                      />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In to Dashboard
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-4 w-4 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    >
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Security note */}
            <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-slate-400 sm:text-xs">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-4 w-4 shrink-0"
                aria-hidden="true"
              >
                <rect x="5" y="10" width="14" height="11" rx="2.5" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
              Secure sign-in to your business account
            </div>

            <div className="mt-6 border-t border-slate-200 pt-4 text-center">
              <p className="text-xs font-medium text-slate-500">
                Edizokitchenware Management System
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                © {new Date().getFullYear()} · Version 1.0
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
