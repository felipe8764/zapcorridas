import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import Login from "./Login";
import PassengerArea from "./PassengerArea";
import DriverArea from "./DriverArea";

export default function Home() {
  const sessionQuery = trpc.whatsappAuth.getSession.useQuery(undefined, { retry: false });
  const logoutMutation = trpc.whatsappAuth.logout.useMutation();
  const [forceRefresh, setForceRefresh] = useState(0);

  const handleLogin = () => {
    sessionQuery.refetch();
    setForceRefresh((p) => p + 1);
  };

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    sessionQuery.refetch();
    setForceRefresh((p) => p + 1);
  };

  if (sessionQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="animate-spin w-10 h-10 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const session = sessionQuery.data;

  if (!session) {
    return <Login onLogin={handleLogin} />;
  }

  if (session.userType === "driver") {
    return <DriverArea session={session as any} onLogout={handleLogout} />;
  }

  return <PassengerArea session={session as any} onLogout={handleLogout} />;
}
