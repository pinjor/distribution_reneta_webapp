import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiEndpoints } from "@/lib/api";
import { DEMO_USERS, type DemoUser } from "@/lib/demoUsers";
import { SignInCard } from "@/components/ui/sign-in-card-2";

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, isAuthenticated, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [activeDemoId, setActiveDemoId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; remember_me?: boolean }) => {
      return apiEndpoints.auth.login(data);
    },
    onSuccess: (data) => {
      setFormError(null);
      login(data.access_token, data.user, rememberMe);
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.user.first_name}!`,
      });
      navigate("/");
    },
    onError: (error: Error) => {
      const message = error.message || "Invalid email or password";
      setFormError(message);
      toast({
        title: "Login failed",
        description: message,
        variant: "destructive",
      });
      setActiveDemoId(null);
    },
  });

  const submitLogin = (email: string, password: string) => {
    setFormError(null);
    loginMutation.mutate({ email, password, remember_me: rememberMe });
  };

  const validate = (email: string, password: string) => {
    let ok = true;
    const emailTrim = email.trim();

    if (!emailTrim) {
      setEmailError("Email is required");
      ok = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      setEmailError("Enter a valid email address");
      ok = false;
    } else {
      setEmailError(undefined);
    }

    if (!password) {
      setPasswordError("Password is required");
      ok = false;
    } else {
      setPasswordError(undefined);
    }

    return ok;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!validate(formData.email, formData.password)) {
      return;
    }
    setActiveDemoId(null);
    submitLogin(formData.email.trim(), formData.password);
  };

  const handleDemoLogin = (demo: DemoUser) => {
    setEmailError(undefined);
    setPasswordError(undefined);
    setFormError(null);
    setFormData({ email: demo.email, password: demo.password });
    setActiveDemoId(demo.id);
    submitLogin(demo.email, demo.password);
  };

  return (
    <SignInCard
      email={formData.email}
      password={formData.password}
      onEmailChange={(email) => {
        setFormData((prev) => ({ ...prev, email }));
        if (emailError) setEmailError(undefined);
        if (formError) setFormError(null);
      }}
      onPasswordChange={(password) => {
        setFormData((prev) => ({ ...prev, password }));
        if (passwordError) setPasswordError(undefined);
        if (formError) setFormError(null);
      }}
      showPassword={showPassword}
      onTogglePassword={() => setShowPassword((v) => !v)}
      rememberMe={rememberMe}
      onRememberMeChange={setRememberMe}
      isLoading={loginMutation.isPending}
      onSubmit={handleSubmit}
      emailError={emailError}
      passwordError={passwordError}
      formError={formError}
      demoUsers={DEMO_USERS}
      onDemoLogin={handleDemoLogin}
      activeDemoId={activeDemoId}
    />
  );
}
