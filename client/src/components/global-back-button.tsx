import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";

export function GlobalBackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/");
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={handleBack}
      className="fixed top-4 left-3 z-[70] bg-background/95 backdrop-blur-sm rounded-full"
      aria-label={`Go back from ${location.pathname}`}
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );
}
