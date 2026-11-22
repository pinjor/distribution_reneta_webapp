import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthFrame, authButtonClass, authFieldClass } from "@/components/auth/AuthFrame";

export default function Signup() {
  const navigate = useNavigate();
  const { toast } = useToast();
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
    mutationFn: async (data: typeof formData) => apiEndpoints.auth.signup(data),
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

  const handleSubmit = (e: FormEvent) => {
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

  const set = (key: keyof typeof formData) => (value: string) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const pending = signupMutation.isPending;

  return (
    <AuthFrame
      brandName="Renata Distribution"
      brandSubtitle="Request a desk account for your depot."
    >
      <h2 className="text-[1.85rem] font-semibold tracking-[-0.035em] text-[#0B1B33]">
        Create account
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[#2C4A73]">
        Fields marked required are needed before the desk can issue access.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Employee ID" id="employee_id" required value={formData.employee_id} onChange={set("employee_id")} placeholder="EMP001" disabled={pending} />
          <Field label="Department" id="department" value={formData.department} onChange={set("department")} placeholder="IT" disabled={pending} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" id="first_name" required value={formData.first_name} onChange={set("first_name")} placeholder="Karim" disabled={pending} autoComplete="given-name" />
          <Field label="Last name" id="last_name" value={formData.last_name} onChange={set("last_name")} placeholder="Ahmed" disabled={pending} autoComplete="family-name" />
        </div>
        <Field label="Email" id="email" required type="email" value={formData.email} onChange={set("email")} placeholder="name@renata.com" disabled={pending} autoComplete="email" />
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-[#0B1B33]">
            Password <span className="text-[#0C4CA1]">*</span>
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={formData.password}
              onChange={(e) => set("password")(e.target.value)}
              required
              disabled={pending}
              className={cn(authFieldClass, "pr-11")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              disabled={pending}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#0C4CA1] hover:bg-[#E7EEF8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C4CA1]/35"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone" id="phone" type="tel" value={formData.phone} onChange={set("phone")} placeholder="+8801…" disabled={pending} autoComplete="tel" />
          <Field label="Designation" id="designation" value={formData.designation} onChange={set("designation")} placeholder="Manager" disabled={pending} />
        </div>

        <button type="submit" disabled={pending} className={cn(authButtonClass, "mt-2")}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : (
            <>
              Create account
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <p className="mt-8 text-sm text-[#2C4A73]">
        Already on the desk?{" "}
        <Link
          to="/login"
          className="font-semibold text-[#0C4CA1] underline decoration-[#C5D4EE] underline-offset-4 hover:decoration-[#0C4CA1]"
        >
          Sign in
        </Link>
      </p>
    </AuthFrame>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled,
  required,
  type = "text",
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled: boolean;
  required?: boolean;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-[#0B1B33]">
        {label} {required && <span className="text-[#0C4CA1]">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={authFieldClass}
      />
    </div>
  );
}
