import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Boxes, ClipboardCheck, Eye, EyeOff, Loader2, ShieldCheck, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { LOGO_SRC } from "@/components/layout/AppBrand";
import { WarehouseLoginVisual } from "@/components/ui/warehouse-login-visual";
import { cn } from "@/lib/utils";

const highlights = [
  { icon: Boxes, text: "Batch-aware pharmaceutical inventory" },
  { icon: Truck, text: "Warehouse to depot distribution" },
  { icon: ClipboardCheck, text: "Controlled stock movements & audits" },
];

function Field({
  id,
  label,
  required,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled,
  trailing,
}: {
  id: string;
  label: string;
  required?: boolean;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete?: string;
  disabled?: boolean;
  trailing?: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium text-[#172033]">
        {label}
        {required ? <span className="ml-0.5 text-[#DC2626]">*</span> : null}
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
          required={required}
          className={cn(
            "flex h-11 w-full rounded-[10px] border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#172033]",
            "placeholder:text-slate-400 shadow-sm transition-[border-color,box-shadow] duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C4DA1]/20 focus-visible:border-[#0C4DA1]",
            "disabled:cursor-not-allowed disabled:opacity-60",
            trailing && "pr-11",
          )}
        />
        {trailing}
      </div>
    </div>
  );
}

export default function Signup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: "",
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    phone: "",
    department: "",
    designation: "",
  });

  const signupMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiEndpoints.auth.signup(data);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Account created",
        description: "Your account has been created successfully. Please sign in.",
      });
      navigate("/login");
    },
    onError: (error: Error) => {
      toast({
        title: "Signup failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });

  const setField = (key: keyof typeof formData) => (value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employee_id || !formData.first_name || !formData.email || !formData.password) {
      toast({
        title: "Validation error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Validation error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    signupMutation.mutate(formData);
  };

  const fadeUp = (delay = 0) =>
    reduceMotion
      ? { initial: false as const, animate: { opacity: 1, y: 0 } }
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  const pending = signupMutation.isPending;

  return (
    <div className="grid min-h-screen w-full bg-[#F7F9FC] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#14263D] px-10 py-10 text-white lg:flex xl:px-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(12,77,161,0.42), transparent 55%), radial-gradient(ellipse 70% 50% at 90% 90%, rgba(13,148,136,0.18), transparent 50%)",
          }}
        />

        <motion.div {...fadeUp(0)} className="relative z-10">
          <div className="flex items-center gap-3">
            <img src={LOGO_SRC} alt="" className="h-12 w-12 rounded-xl bg-white/95 object-cover shadow-md" />
            <div>
              <p className="text-sm font-semibold tracking-[0.14em] text-[#6ac6df]">RENATA DMS</p>
              <p className="text-xs text-white/60">Pharmaceutical logistics platform</p>
            </div>
          </div>
        </motion.div>

        <div className="relative z-10 mt-12 max-w-xl space-y-6">
          <motion.h1 {...fadeUp(0.08)} className="text-3xl font-semibold leading-tight tracking-tight text-white xl:text-4xl">
            Join the distribution workspace
          </motion.h1>
          <motion.p {...fadeUp(0.14)} className="max-w-md text-base leading-relaxed text-white/70">
            Create an account to manage orders, routes, collections, and warehouse stock from one secure platform.
          </motion.p>
          <motion.ul {...fadeUp(0.2)} className="space-y-3 pt-2">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/80">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/8">
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
            Access is reviewed for authorized depot operators
          </div>
        </motion.div>
      </aside>

      <main className="relative flex flex-col justify-center px-5 py-10 sm:px-8 sm:py-12">
        <div className="mx-auto w-full max-w-[480px]">
          <motion.div {...fadeUp(0)} className="mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <img
                src={LOGO_SRC}
                alt="RENATA DMS"
                className="h-11 w-11 rounded-xl border border-[#E2E8F0] object-cover shadow-sm"
              />
              <div>
                <p className="text-sm font-bold tracking-[0.1em] text-[#14263D]">RENATA DMS</p>
                <p className="text-xs text-slate-500">Distribution Management System</p>
              </div>
            </div>
          </motion.div>

          <motion.div {...fadeUp(0.06)} className="mb-7 space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-[#172033] sm:text-[1.75rem]">Create account</h2>
            <p className="text-sm leading-relaxed text-slate-500">
              Register with your employee details to request access.
            </p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                id="employee_id"
                label="Employee ID"
                required
                placeholder="EMP001"
                autoComplete="username"
                value={formData.employee_id}
                onChange={setField("employee_id")}
                disabled={pending}
              />
              <Field
                id="department"
                label="Department"
                placeholder="IT"
                value={formData.department}
                onChange={setField("department")}
                disabled={pending}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                id="first_name"
                label="First name"
                required
                placeholder="John"
                autoComplete="given-name"
                value={formData.first_name}
                onChange={setField("first_name")}
                disabled={pending}
              />
              <Field
                id="last_name"
                label="Last name"
                placeholder="Doe"
                autoComplete="family-name"
                value={formData.last_name}
                onChange={setField("last_name")}
                disabled={pending}
              />
            </div>

            <Field
              id="email"
              label="Email"
              required
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              value={formData.email}
              onChange={setField("email")}
              disabled={pending}
            />

            <Field
              id="password"
              label="Password"
              required
              type={showPassword ? "text" : "password"}
              placeholder="Minimum 6 characters"
              autoComplete="new-password"
              value={formData.password}
              onChange={setField("password")}
              disabled={pending}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={pending}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition-colors hover:text-[#14263D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C4DA1]/30"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                id="phone"
                label="Phone"
                type="tel"
                placeholder="+8801XXXXXXXXX"
                autoComplete="tel"
                value={formData.phone}
                onChange={setField("phone")}
                disabled={pending}
              />
              <Field
                id="designation"
                label="Designation"
                placeholder="Manager"
                autoComplete="organization-title"
                value={formData.designation}
                onChange={setField("designation")}
                disabled={pending}
              />
            </div>

            <motion.button
              type="submit"
              disabled={pending}
              whileHover={reduceMotion || pending ? undefined : { scale: 1.01 }}
              whileTap={reduceMotion || pending ? undefined : { scale: 0.985 }}
              className={cn(
                "group relative mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-[10px]",
                "bg-[#0C4DA1] text-sm font-semibold text-white shadow-sm",
                "transition-[background-color,box-shadow] duration-200 hover:bg-[#0A3F86] hover:shadow-md",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C4DA1]/40 focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-70",
              )}
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Creating account…
                </>
              ) : (
                <>
                  Sign up
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </>
              )}
            </motion.button>

            <p className="pt-1 text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-[#0C4DA1] underline-offset-4 hover:text-[#0A3F86] hover:underline"
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
