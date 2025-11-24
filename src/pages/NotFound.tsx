import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center">
            <h1 className="mb-4 text-6xl font-bold text-primary">404</h1>
            <p className="mb-2 text-xl font-semibold text-foreground">Oops! Page not found</p>
            <p className="mb-6 text-sm text-muted-foreground">
              The page you're looking for doesn't exist or has been moved.
            </p>
            {location.pathname !== "/" && (
              <p className="mb-6 text-xs text-muted-foreground font-mono">
                Attempted: {location.pathname}
              </p>
            )}
            <Button onClick={() => navigate("/")} className="gap-2">
              <Home className="h-4 w-4" />
              Return to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
