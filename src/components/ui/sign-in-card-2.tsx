import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DemoUser } from "@/lib/demoUsers";
import { AuthFrame, authButtonClass, authFieldClass } from "@/components/auth/AuthFrame";

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
  onSubmit: (e: FormEvent) => void;
  demoUsers?: DemoUser[];
  onDemoLogin?: (demo: DemoUser) => void;
  activeDemoId?: string | null;
  brandName?: string;
  brandSubtitle?: string;
}

const fieldClass = authFieldClass;

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
  demoUsers = [],
  onDemoLogin,
  activeDemoId,
  brandName = "Renata Distribution",
  brandSubtitle = "Depot orders, stock, and collections on one desk.",
}: SignInCardProps) {
  return (
    <AuthFrame brandName={brandName} brandSubtitle={brandSubtitle}>
          <h2 className="text-[1.85rem] font-semibold tracking-[-0.035em] text-[#0B1B33]">
            Sign in
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#2C4A73]">
            Use the account issued for your depot.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-sm font-medium text-[#0B1B33]">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="name@renata.com"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                disabled={isLoading}
                required
                className={fieldClass}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-sm font-medium text-[#0B1B33]">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  disabled={isLoading}
                  required
                  className={cn(fieldClass, "pr-11")}
                />
                <button
                  type="button"
                  onClick={onTogglePassword}
                  disabled={isLoading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#0C4CA1] hover:bg-[#E7EEF8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C4CA1]/35"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-[#2C4A73]">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => onRememberMeChange(e.target.checked)}
                disabled={isLoading}
                className="h-4 w-4 rounded border-[#C5D4EE] accent-[#0C4CA1]"
              />
              Keep me signed in on this desk
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className={authButtonClass}
            >
              {isLoading && !activeDemoId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {demoUsers.length > 0 && onDemoLogin && (
            <div className="mt-8">
              <p className="text-sm font-medium text-[#0B1B33]">Demo desks</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {demoUsers.map((demo) => {
                  const loading = isLoading && activeDemoId === demo.id;
                  return (
                    <button
                      key={demo.id}
                      type="button"
                      title={demo.description}
                      onClick={() => onDemoLogin(demo)}
                      disabled={isLoading}
                      className="inline-flex items-center gap-2 rounded-full border border-[#D5E1F2] bg-[#F7FAFF] px-3.5 py-2 text-sm font-medium text-[#0C4CA1] transition-colors hover:border-[#0C4CA1] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C4CA1]/30 disabled:opacity-60"
                    >
                      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {demo.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-[#2C4A73]">Shared password admin123</p>
            </div>
          )}

          <p className="mt-8 text-sm text-[#2C4A73]">
            Need an account?{" "}
            <Link
              to="/signup"
              className="font-semibold text-[#0C4CA1] underline decoration-[#C5D4EE] underline-offset-4 hover:decoration-[#0C4CA1]"
            >
              Request access
            </Link>
          </p>
    </AuthFrame>
  );
}

export const Component = SignInCard;
export default SignInCard;
