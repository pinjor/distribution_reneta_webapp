import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Package, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { CheckBox } from "@/components/ui/checkbox";
import { BRAND } from "@/lib/brandTheme";
import type { DemoUser } from "@/lib/demoUsers";

function GlassInput({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full min-w-0 rounded-lg border-2 px-3 py-1 text-sm font-medium shadow-md transition-[color,box-shadow,border-color,background-color] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "bg-brand-tile-from border-brand-deep/55 text-brand-deep placeholder:text-brand-deep/70 placeholder:font-normal",
        "focus-visible:bg-white focus-visible:border-brand-deep focus-visible:ring-2 focus-visible:ring-brand-deep/20",
        className,
      )}
      {...props}
    />
  );
}

const inputIconClass = (focused: boolean) =>
  cn(
    "absolute left-3 w-4 h-4 transition-all duration-300 z-10",
    focused ? "text-brand-deep" : "text-brand-deep/80",
  );

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
  demoUsers?: DemoUser[];
  onDemoLogin?: (demo: DemoUser) => void;
  activeDemoId?: string | null;
  brandName?: string;
  brandSubtitle?: string;
}

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
  brandName = "Swift Distribution Hub",
  brandSubtitle = "Sign in to Renata Distribution Management",
}: SignInCardProps) {
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [10, -10]);
  const rotateY = useTransform(mouseX, [-300, 300], [-10, 10]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-brand-tile-from via-brand-tile-via to-brand-from relative overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-from/30 via-brand-to/20 to-brand-deep/40" />

      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-soft-light"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }}
      />

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120vh] h-[60vh] rounded-b-[50%] bg-brand-from/25 blur-[80px]" />
      <motion.div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[100vh] h-[60vh] rounded-b-full bg-brand-tile-to/40 blur-[60px]"
        animate={{ opacity: [0.3, 0.5, 0.3], scale: [0.98, 1.02, 0.98] }}
        transition={{ duration: 8, repeat: Infinity, repeatType: "mirror" }}
      />
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[90vh] h-[90vh] rounded-t-full bg-brand-to/25 blur-[60px]"
        animate={{ opacity: [0.25, 0.45, 0.25], scale: [1, 1.1, 1] }}
        transition={{ duration: 6, repeat: Infinity, repeatType: "mirror", delay: 1 }}
      />

      <div className="absolute left-1/4 top-1/4 w-96 h-96 bg-brand-from/15 rounded-full blur-[100px] animate-pulse opacity-60" />
      <div className="absolute right-1/4 bottom-1/4 w-96 h-96 bg-brand-tile-to/30 rounded-full blur-[100px] animate-pulse opacity-60" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-sm relative z-10"
        style={{ perspective: 1500 }}
      >
        <motion.div
          className="relative"
          style={{ rotateX, rotateY }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          whileHover={{ z: 10 }}
        >
          <div className="relative group">
            <motion.div
              className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-70 transition-opacity duration-700"
              animate={{
                boxShadow: [
                  `0 0 10px 2px ${BRAND.from}20`,
                  `0 0 20px 8px ${BRAND.from}30`,
                  `0 0 10px 2px ${BRAND.from}20`,
                ],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", repeatType: "mirror" }}
            />

            <div className="absolute -inset-[0.5px] rounded-2xl bg-gradient-to-r from-brand-from/20 via-brand-to/30 to-brand-from/20 opacity-60 group-hover:opacity-90 transition-opacity duration-500 pointer-events-none" />

            <div className="relative bg-white rounded-2xl p-6 border-2 border-brand-deep/25 shadow-2xl shadow-brand-deep/15 overflow-hidden">
              <div
                className="absolute inset-0 opacity-[0.04] pointer-events-none"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #6ac6df 0.5px, transparent 0.5px), linear-gradient(45deg, #6ac6df 0.5px, transparent 0.5px)",
                  backgroundSize: "30px 30px",
                }}
              />

              <div className="text-center space-y-1 mb-5 relative z-10">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", duration: 0.8 }}
                  className="mx-auto w-12 h-12 rounded-full border border-brand-from/30 flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-brand-from to-brand-to shadow-lg shadow-brand-from/30"
                >
                  <Package className="h-6 w-6 text-white" />
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50" />
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-deep via-brand-to to-brand-from"
                >
                  Welcome Back
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-brand-deep/70 text-xs"
                >
                  {brandSubtitle}
                </motion.p>
                <p className="text-brand-to/80 text-[10px] font-medium tracking-wide uppercase">{brandName}</p>
              </div>

              <form onSubmit={onSubmit} className="space-y-4 relative z-10">
                <motion.div className="space-y-4">
                  <motion.div
                    className={cn("relative space-y-1.5", focusedInput === "email" && "z-10")}
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <label htmlFor="login-email" className="text-xs font-semibold text-brand-deep">
                      Email address
                    </label>
                    <div className="relative flex items-center overflow-hidden rounded-lg">
                      <Mail className={inputIconClass(focusedInput === "email")} />
                      <GlassInput
                        id="login-email"
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => onEmailChange(e.target.value)}
                        onFocus={() => setFocusedInput("email")}
                        onBlur={() => setFocusedInput(null)}
                        disabled={isLoading}
                        required
                        className="pl-10 pr-3"
                      />
                    </div>
                  </motion.div>

                  <motion.div
                    className={cn("relative space-y-1.5", focusedInput === "password" && "z-10")}
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <label htmlFor="login-password" className="text-xs font-semibold text-brand-deep">
                      Password
                    </label>
                    <div className="relative flex items-center overflow-hidden rounded-lg">
                      <Lock className={inputIconClass(focusedInput === "password")} />
                      <GlassInput
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => onPasswordChange(e.target.value)}
                        onFocus={() => setFocusedInput("password")}
                        onBlur={() => setFocusedInput(null)}
                        disabled={isLoading}
                        required
                        className="pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={onTogglePassword}
                        className="absolute right-3 z-10 text-brand-deep/80 hover:text-brand-deep transition-colors"
                        disabled={isLoading}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center space-x-2">
                    <CheckBox
                      checked={rememberMe}
                      onClick={() => !isLoading && onRememberMeChange(!rememberMe)}
                      size={18}
                      color={BRAND.from}
                      className="border-2 border-brand-deep/55 bg-brand-tile-from hover:bg-white"
                    />
                    <label
                      htmlFor="remember-me"
                      onClick={() => !isLoading && onRememberMeChange(!rememberMe)}
                      className="text-xs text-brand-deep font-medium hover:text-brand-deep transition-colors cursor-pointer"
                    >
                      Remember me
                    </label>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full relative group/button mt-2"
                >
                  <div className="absolute inset-0 bg-brand-from/20 rounded-lg blur-lg opacity-0 group-hover/button:opacity-70 transition-opacity duration-300" />
                  <div className="relative overflow-hidden rounded-full bg-white text-brand-deep font-semibold h-10 border border-brand-from/35 shadow-md transition-all duration-300 flex items-center justify-center hover:bg-brand-tile-from hover:border-brand-from/50 hover:shadow-lg">
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -z-10"
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 1 }}
                      style={{ opacity: isLoading ? 1 : 0 }}
                    />
                    <AnimatePresence mode="wait">
                      {isLoading ? (
                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <div className="w-4 h-4 border-2 border-brand-deep/40 border-t-transparent rounded-full animate-spin" />
                        </motion.div>
                      ) : (
                        <motion.span
                          key="button-text"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center justify-center gap-1 text-sm font-medium"
                        >
                          Sign In
                          <ArrowRight className="w-3 h-3 group-hover/button:translate-x-1 transition-transform duration-300" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.button>

                {demoUsers.length > 0 && onDemoLogin && (
                  <>
                    <div className="relative mt-2 mb-3 flex items-center">
                      <div className="flex-grow border-t border-brand-from/15" />
                      <motion.span
                        className="mx-3 text-xs text-brand-to/60"
                        animate={{ opacity: [0.7, 0.9, 0.7] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      >
                        demo accounts
                      </motion.span>
                      <div className="flex-grow border-t border-brand-from/15" />
                    </div>

                    <div className="space-y-2">
                      {demoUsers.map((demo, index) => {
                        const loading = isLoading && activeDemoId === demo.id;
                        return (
                          <motion.button
                            key={demo.id}
                            type="button"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + index * 0.08 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onDemoLogin(demo)}
                            disabled={isLoading}
                            className="w-full relative group/demo disabled:opacity-60"
                          >
                            <div className="absolute inset-0 bg-brand-from/10 rounded-lg blur opacity-0 group-hover/demo:opacity-70 transition-opacity duration-300" />
                            <div className="relative overflow-hidden bg-brand-tile-from text-brand-deep h-auto rounded-lg border-2 border-brand-deep/45 hover:border-brand-deep/70 shadow-md transition-all duration-300 flex items-center gap-3 p-2.5 text-left">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-from/25 border border-brand-deep/30">
                                <LogIn className="h-3.5 w-3.5 text-brand-deep" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold">{demo.label}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-from/15 capitalize text-brand-deep/80">{demo.role}</span>
                                </div>
                                <p className="text-[10px] text-brand-deep/75 truncate">{demo.email}</p>
                              </div>
                              <span className="text-[10px] font-medium text-brand-from shrink-0 pr-1">
                                {loading ? "…" : "→"}
                              </span>
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-brand-from/0 via-brand-from/5 to-brand-from/0 pointer-events-none"
                                initial={{ x: "-100%" }}
                                whileHover={{ x: "100%" }}
                                transition={{ duration: 1, ease: "easeInOut" }}
                              />
                            </div>
                          </motion.button>
                        );
                      })}
                      <p className="text-center text-[10px] text-brand-to/60">
                        Password for all demos: <span className="font-mono text-brand-deep/80">admin123</span>
                      </p>
                    </div>
                  </>
                )}

                <motion.p
                  className="text-center text-xs text-brand-deep/70 mt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  Don&apos;t have an account?{" "}
                  <Link to="/signup" className="relative inline-block group/signup">
                    <span className="relative z-10 text-brand-from group-hover/signup:text-brand-to transition-colors duration-300 font-medium">
                      Sign up
                    </span>
                    <span className="absolute bottom-0 left-0 w-0 h-px bg-brand-from group-hover/signup:w-full transition-all duration-300" />
                  </Link>
                </motion.p>
              </form>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

/** Alias for demo compatibility */
export const Component = SignInCard;
export default SignInCard;
