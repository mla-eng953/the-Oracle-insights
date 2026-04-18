import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { DeleteAccountForm } from "@/components/DeleteAccountDialog";

export default function DeleteAccount() {
  return (
    <PageTransition>
      <div className="flex flex-col gap-3 py-3">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link to="/settings"><ChevronLeft className="h-4 w-4" /> Settings</Link>
        </Button>
        <DeleteAccountForm />
      </div>
    </PageTransition>
  );
}
