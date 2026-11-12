import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Boxes,
  Truck,
  ClipboardCheck,
  LogIn,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CheckBox } from "@/components/ui/checkbox";
import { BRAND } from "@/lib/brandTheme";
import { LOGO_SRC } from "@/components/layout/AppBrand";
import { WarehouseLoginVisual } from "@/components/ui/warehouse-login-visual";
import type { DemoUser } from "@/lib/demoUsers";

function LoginField({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled,
  error,
  trailing,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
  disabled?: boolean;
  error?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-[#172033]">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            "flex h-11 w-full rounded-[10px] border bg-white px-3.5 text-sm text-[#172033]",
            "placeholder:text-slate-400 shadow-sm transition-[border-color,box-shadow,background-color] duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/25 focus-visible:border-[#0D9488]",
            "disabled:cursor-not-allowed disabled:opacity-60",
            error ? "border-red-400 focus-visible:ring-red-200" : "border-[#E2E8F0]",
            trailing && "pr-11",
          )}
        />
        {trailing}
      </div>
      <AnimatePresence>
        {error ? (
          <motion.p
            id={`${id}-error`}
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-xs text-red-600"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export interface SignInCardProps {
  email: string;
  password: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  showPassword: boolean;
  onTogglePassword: () => void;
  rememberMe: boolean;
  onRememberMeChange: (value: boolean) => void;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  emailError?: string;
  passwordError?: string;
  formError?: string | null;
  demoUsers?: DemoUser[];
  onDemoLogin?: (demo: DemoUser) => void;
  activeDemoId?: string | null;
  brandName?: string;
  brandSubtitle?: string;
}

const highlights = [
  { icon: Boxes, text: "Batch-aware pharmaceutical inventory" },
  { icon: Truck, text: "Warehouse to depot distribution" },
  { icon: ClipboardCheck, text: "Controlled stock movements & audits" },
];

export function SignInCard({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  showPassword,
  onTogglePassword,
  rememberMe,
  onRememberMeChange,
  isLoading,
  onSubmit,
  emailError,
  passwordError,
  formError,
  demoUsers = [],
  onDemoLogin,
  activeDemoId,
  brandName = "RENATA DMS",
  brandSubtitle = "Distribution Management System",
}: SignInCardProps) {
  const reduceMotion = useReducedMotion();
  const [showDemos, setShowDemos] = useState(false);

  const fadeUp = (delay = 0) =>
    reduceMotion
      ? { initial: false as const, animate: { opacity: 1, y: 0 } }
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  const formItem = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.95fr)] bg-[#F7F9FC]">
      {/* Left — branding */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#14263D] text-white px-10 xl:px-14 py-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(106,198,223,0.28), transparent 55%), radial-gradient(ellipse 70% 50% at 90% 90%, rgba(13,148,136,0.18), transparent 50%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.9) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <motion.div {...fadeUp(0)} className="relative z-10">
          <div className="flex items-center gap-3">
            <img
              src={LOGO_SRC}
              alt=""
              className="h-12 w-12 rounded-xl object-cover bg-white/95 shadow-md"
            />
            <div>
              <p className="text-sm font-semibold tracking-[0.14em] text-[#6ac6df]">{brandName}</p>
              <p className="text-xs text-white/60">Pharmaceutical logistics platform</p>
            </div>
          </div>
        </motion.div>

        <div className="relative z-10 mt-12 max-w-xl space-y-6">
          <motion.h1
            {...fadeUp(0.08)}
            className="text-3xl xl:text-4xl font-semibold leading-tight tracking-tight text-white"
          >
            {brandSubtitle}
          </motion.h1>
          <motion.p {...fadeUp(0.14)} className="text-base leading-relaxed text-white/70 max-w-md">
            Manage pharmaceutical inventory, warehouse operations, stock movements, and
            distribution from one secure platform.
          </motion.p>

          <motion.ul {...fadeUp(0.2)} className="space-y-3 pt-2">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/80">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/8 border border-white/10">
                  <Icon className="h-4 w-4 text-[#6ac6df]" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </motion.ul>
        </div>

        <motion.div {...fadeUp(0.24)} className="relative z-10 mt-8">
          <WarehouseLoginVisual className="w-full max-w-lg opacity-95" />
          <div className="mt-6 flex items-center gap-2 text-xs text-white/50">
            <ShieldCheck className="h-3.5 w-3.5 text-[#0D9488]" aria-hidden />
            Secure access for authorized warehouse operators
          </div>
        </motion.div>
      </aside>

      {/* Right — form */}
      <main className="relative flex flex-col justify-center px-5 sm:px-8 py-10 sm:py-12">
        <div className="mx-auto w-full max-w-[420px]">
          {/* Compact branding on smaller screens */}
          <motion.div {...fadeUp(0)} className="mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <img
                src={LOGO_SRC}
                alt="RENATA DMS"
                className="h-11 w-11 rounded-xl object-cover shadow-sm border border-[#E2E8F0]"
              />
              <div>
                <p className="text-sm font-bold tracking-[0.1em] text-[#14263D]">{brandName}</p>
                <p className="text-xs text-slate-500">Distribution Management System</p>
              </div>
            </div>
          </motion.div>

          <motion.div {...fadeUp(0.06)} className="mb-8 space-y-2">
            <h2 className="text-2xl sm:text-[1.75rem] font-semibold tracking-tight text-[#172033]">
              Welcome back
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Sign in to access your warehouse management workspace.
            </p>
          </motion.div>

          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <AnimatePresence>
              {formError ? (
                <motion.div
                  role="alert"
                  initial={reduceMotion ? false : { opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-[10px] border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
                >
                  {formError}
                </motion.div>
              ) : null}
            </AnimatePresence>

            <motion.div {...formItem(0.12)}>
              <LoginField
                id="login-email"
                label="Email address"
                type="email"
                value={email}
                onChange={onEmailChange}
                placeholder="you@company.com"
                autoComplete="username"
                disabled={isLoading}
                error={emailError}
              />
            </motion.div>

            <motion.div {...formItem(0.18)}>
              <LoginField
                id="login-password"
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={onPasswordChange}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={isLoading}
                error={passwordError}
                trailing={
                  <button
                    type="button"
                    onClick={onTogglePassword}
                    disabled={isLoading}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition-colors hover:text-[#14263D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/30"
                  >
                    <motion.span
                      key={showPassword ? "hide" : "show"}
                      initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.18 }}
                      className="flex"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </motion.span>
                  </button>
                }
              />
            </motion.div>

            <motion.div
              {...formItem(0.24)}
              className="flex items-center justify-between gap-3 pt-0.5"
            >
              <div className="flex items-center gap-2.5">
                <CheckBox
                  checked={rememberMe}
                  onClick={() => !isLoading && onRememberMeChange(!rememberMe)}
                  size={18}
                  color={BRAND.deep}
                  className="border border-[#E2E8F0] bg-white hover:bg-slate-50"
                />
                <label
                  htmlFor="remember-me"
                  onClick={() => !isLoading && onRememberMeChange(!rememberMe)}
                  className="text-sm text-slate-600 cursor-pointer select-none"
                >
                  Remember me
                </label>
              </div>
            </motion.div>

            <motion.div {...formItem(0.3)}>
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={reduceMotion || isLoading ? undefined : { scale: 1.01 }}
                whileTap={reduceMotion || isLoading ? undefined : { scale: 0.985 }}
                transition={{ duration: 0.18 }}
                className={cn(
                  "group relative flex h-11 w-full items-center justify-center gap-2 rounded-[10px]",
                  "bg-[#14263D] text-sm font-semibold text-white",
                  "shadow-sm transition-[background-color,box-shadow] duration-200",
                  "hover:bg-[#1a314d] hover:shadow-md",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40 focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-70",
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </>
                )}
              </motion.button>
            </motion.div>

            {demoUsers.length > 0 && onDemoLogin ? (
              <motion.div {...formItem(0.36)} className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowDemos((v) => !v)}
                  className="text-xs font-medium text-slate-500 hover:text-[#0D9488] transition-colors"
                >
                  {showDemos ? "Hide demo accounts" : "Use a demo account"}
                </button>
                <AnimatePresence>
                  {showDemos ? (
                    <motion.div
                      initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 space-y-2">
                        {demoUsers.map((demo) => {
                          const loading = isLoading && activeDemoId === demo.id;
                          return (
                            <button
                              key={demo.id}
                              type="button"
                              onClick={() => onDemoLogin(demo)}
                              disabled={isLoading}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-[10px] border border-[#E2E8F0] bg-white px-3 py-2.5 text-left",
                                "transition-colors hover:border-[#0D9488]/40 hover:bg-[#F7F9FC]",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/30",
                                "disabled:opacity-60",
                              )}
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#14263D]/5 text-[#14263D]">
                                <LogIn className="h-3.5 w-3.5" aria-hidden />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-xs font-semibold text-[#172033]">
                                  {demo.label}
                                  <span className="ml-2 font-normal capitalize text-slate-400">
                                    {demo.role}
                                  </span>
                                </span>
                                <span className="block truncate text-[11px] text-slate-500">
                                  {demo.email}
                                </span>
                              </span>
                              <span className="text-[11px] font-medium text-[#0D9488]">
                                {loading ? "…" : "→"}
                              </span>
                            </button>
                          );
                        })}
                        <p className="text-center text-[11px] text-slate-400">
                          Demo password: <span className="font-mono text-slate-600">admin123</span>
                        </p>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            ) : null}

            <motion.p
              {...formItem(0.4)}
              className="pt-2 text-center text-sm text-slate-500"
            >
              Don&apos;t have an account?{" "}
              <Link
                to="/signup"
                className="font-semibold text-[#0D9488] hover:text-[#0f766e] underline-offset-4 hover:underline"
              >
                Sign up
              </Link>
            </motion.p>
          </form>
        </div>
      </main>
    </div>
  );
}

/** Alias for demo compatibility */
export const Component = SignInCard;
export default SignInCard;
