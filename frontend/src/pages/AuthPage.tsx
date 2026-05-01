import React, { useMemo, useState } from 'react'
import { ArrowRight, Lock, Mail, ShieldCheck, User } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useUIStore } from '../stores/uiStore'

type AuthMode = 'sign-in' | 'sign-up'

interface AuthPageProps {
  mode: AuthMode
}

const roleOptions = [
  { value: 'CEO', label: 'CEO / System Admin' },
  { value: 'Sales_Manager', label: 'Sales Manager' },
  { value: 'Purchasing_Manager', label: 'Purchasing Manager' },
  { value: 'Warehouse_Manager', label: 'Warehouse Manager' },
  { value: 'Accountant', label: 'Chief Accountant' },
]

const AuthPage: React.FC<AuthPageProps> = ({ mode }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, isInitialized, isLoading, login, register } = useAuth()
  const showNotification = useUIStore((state) => state.showNotification)
  const from = (location.state as { from?: string } | null)?.from || '/app'
  const isSignUp = mode === 'sign-up'

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Sales_Manager',
  })

  const title = useMemo(
    () =>
      isSignUp
        ? 'Create your NovaTech workspace access'
        : 'Sign in to NovaTech ERP',
    [isSignUp]
  )

  if (isInitialized && isAuthenticated) {
    return <Navigate to={from} replace />
  }

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!form.email || !form.password || (isSignUp && !form.full_name)) {
      showNotification('error', 'Please complete the required fields.')
      return
    }

    if (isSignUp && form.password !== form.confirmPassword) {
      showNotification('error', 'Password confirmation does not match.')
      return
    }

    try {
      if (isSignUp) {
        await register({
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
        })
        showNotification('success', 'Account created successfully.')
      } else {
        await login(form.email.trim(), form.password)
        showNotification('success', 'Signed in successfully.')
      }

      navigate(from, { replace: true })
    } catch (error: any) {
      showNotification('error', error?.response?.data?.error || 'Authentication failed.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden overflow-hidden lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.28),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.22),_transparent_35%),linear-gradient(135deg,_#020617,_#0f172a_45%,_#111827)]" />
          <div className="relative flex h-full flex-col justify-between p-12">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-950 font-bold">
                NT
              </div>
              <div>
                <p className="text-lg font-semibold">NovaTech Distribution</p>
                <p className="text-sm text-slate-300">ERP for SmartHome & IoT operations</p>
              </div>
            </div>

            <div className="max-w-xl">
              <p className="mb-4 text-sm uppercase tracking-[0.24em] text-sky-300">
                Unified operations
              </p>
              <h1 className="mb-6 text-5xl font-semibold leading-tight">
                CRM, sales, inventory, and accounting in one focused workspace.
              </h1>
              <p className="max-w-lg text-base leading-7 text-slate-300">
                Built for NovaTech&apos;s distribution flow, from lead intake and quotations to
                deliveries, bills, and stock checks across warehouses.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                ['3', 'Warehouses'],
                ['30', 'Bin locations'],
                ['5', 'Core roles'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                  <p className="text-2xl font-semibold">{value}</p>
                  <p className="mt-2 text-sm text-slate-300">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-md">
            <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
              <span className="rounded-lg border border-white/10 px-2 py-1">NovaTech</span>
              Back to landing
            </Link>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
              <div className="mb-8">
                <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                  <ShieldCheck size={14} />
                  Secure workspace access
                </p>
                <h2 className="text-3xl font-semibold">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {isSignUp
                    ? 'Create an account to review the ERP flows before wiring in production data.'
                    : 'Use your NovaTech account to continue into the ERP workspace.'}
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                {isSignUp && (
                  <label className="block">
                    <span className="mb-2 block text-sm text-slate-300">Full name</span>
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 focus-within:border-sky-400">
                      <User size={18} className="text-slate-500" />
                      <input
                        type="text"
                        value={form.full_name}
                        onChange={(event) => updateField('full_name', event.target.value)}
                        className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                        placeholder="Nguyen Van A"
                      />
                    </div>
                  </label>
                )}

                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">Email</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 focus-within:border-sky-400">
                    <Mail size={18} className="text-slate-500" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) => updateField('email', event.target.value)}
                      className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                      placeholder="you@novatech.vn"
                    />
                  </div>
                </label>

                {isSignUp && (
                  <label className="block">
                    <span className="mb-2 block text-sm text-slate-300">Role</span>
                    <select
                      value={form.role}
                      onChange={(event) => updateField('role', event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none focus:border-sky-400"
                    >
                      {roleOptions.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">Password</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 focus-within:border-sky-400">
                    <Lock size={18} className="text-slate-500" />
                    <input
                      type="password"
                      value={form.password}
                      onChange={(event) => updateField('password', event.target.value)}
                      className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                      placeholder="••••••••"
                    />
                  </div>
                </label>

                {isSignUp && (
                  <label className="block">
                    <span className="mb-2 block text-sm text-slate-300">Confirm password</span>
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 focus-within:border-sky-400">
                      <Lock size={18} className="text-slate-500" />
                      <input
                        type="password"
                        value={form.confirmPassword}
                        onChange={(event) => updateField('confirmPassword', event.target.value)}
                        className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                        placeholder="Repeat password"
                      />
                    </div>
                  </label>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
                  {!isLoading && <ArrowRight size={16} />}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-400">
                {isSignUp ? 'Already have an account?' : 'Need an account?'}{' '}
                <Link
                  to={isSignUp ? '/sign-in' : '/sign-up'}
                  state={{ from }}
                  className="font-medium text-white hover:text-sky-300"
                >
                  {isSignUp ? 'Sign in' : 'Create one'}
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default AuthPage
