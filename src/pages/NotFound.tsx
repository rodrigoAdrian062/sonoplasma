import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PageState } from "@/components/PageState";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="container flex min-h-screen items-center justify-center bg-background px-4">
      <PageState
        variant="error"
        title="Página não encontrada"
        description="O endereço pode ter sido alterado ou não existe. Volte ao início para continuar usando o sistema."
        action={
          <Button asChild variant="outline">
            <Link to="/">Ir para o início</Link>
          </Button>
        }
        className="w-full max-w-md"
      />
    </div>
  );
};

export default NotFound;
