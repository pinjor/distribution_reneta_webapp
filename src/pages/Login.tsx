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
      login(data.access_token, data.user, rememberMe);
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.user.first_name}!`,
      });
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
      setActiveDemoId(null);
    },
  });

  const submitLogin = (email: string, password: string) => {
    loginMutation.mutate({ email, password, remember_me: rememberMe });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast({
        title: "Validation error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    setActiveDemoId(null);
    submitLogin(formData.email, formData.password);
  };

  const handleDemoLogin = (demo: DemoUser) => {
    setFormData({ email: demo.email, password: demo.password });
    setActiveDemoId(demo.id);
    submitLogin(demo.email, demo.password);
  };

  return (
    <SignInCard
      email={formData.email}
      password={formData.password}
      onEmailChange={(email) => setFormData((prev) => ({ ...prev, email }))}
      onPasswordChange={(password) => setFormData((prev) => ({ ...prev, password }))}
      showPassword={showPassword}
      onTogglePassword={() => setShowPassword((v) => !v)}
      rememberMe={rememberMe}
      onRememberMeChange={setRememberMe}
      isLoading={loginMutation.isPending}
      onSubmit={handleSubmit}
      demoUsers={DEMO_USERS}
      onDemoLogin={handleDemoLogin}
      activeDemoId={activeDemoId}
    />
  );
}
