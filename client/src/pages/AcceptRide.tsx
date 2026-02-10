import { useState } from "react";
import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useRoute, useLocation } from "wouter";
import { Car, Loader2, CheckCircle, AlertCircle, MapPin, Route, Clock } from "lucide-react";

// Função para formatar telefone sem código 55
function formatPhone(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("55")) {
    const withoutCode = cleaned.substring(2);
    return `(${withoutCode.substring(0, 2)}) ${withoutCode.substring(2, 7)}-${withoutCode.substring(7)}`;
  }
  return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
}

export default function AcceptRide() {
  const [, params] = useRoute("/aceitar/:rideId");
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const rideId = params?.rideId ? parseInt(params.rideId) : 0;
  const sessionQuery = trpc.whatsappAuth.getSession.useQuery();
  const rideDetailsQuery = trpc.driver.getRideDetails.useQuery({ rideId }, { enabled: rideId > 0 });
  const acceptRide = trpc.driver.acceptRide.useMutation();

  const session = sessionQuery.data;
  const rideDetails = rideDetailsQuery.data;

  const handleAccept = async () => {
    if (!session || session.userType !== "driver") {
      toast.error("Você precisa estar logado como motorista");
      return;
    }
    setLoading(true);
    try {
      await acceptRide.mutateAsync({ rideId, driverId: session.userId });
      toast.success("Corrida aceita! Verifique o WhatsApp para detalhes.");
      setDone(true);
      setTimeout(() => navigate("/"), 2000);
    } catch (e: any) {
      toast.error(e.message || "Erro ao aceitar corrida");
    }
    setLoading(false);
  };

  if (sessionQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
      </div>
    );
  }

  if (!session || session.userType !== "driver") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
            <p className="text-muted-foreground mb-4">Você precisa estar logado como motorista para aceitar corridas.</p>
            <Button onClick={() => navigate("/")} className="w-full rounded-xl h-12">
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Corrida Aceita!</h2>
            <p className="text-muted-foreground">Verifique o WhatsApp para os detalhes do passageiro e localização.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Car className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Aceitar Corrida #{rideId}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {rideDetailsQuery.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
          ) : rideDetails ? (
            <>
              <div className="bg-primary/5 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Origem</p>
                    <p className="text-sm font-medium truncate">{rideDetails.originAddress}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-red-500 mt-1 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Destino</p>
                    <p className="text-sm font-medium truncate">{rideDetails.destinationAddress}</p>
                  </div>
                </div>
                <div className="flex gap-4 pt-2 border-t border-primary/10">
                  <div className="flex items-center gap-2">
                    <Route className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{rideDetails.distanceKm} km</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{rideDetails.durationMinutes} min</span>
                  </div>
                </div>
              </div>
              <p className="text-center text-muted-foreground text-sm">
                Deseja aceitar esta corrida? Você receberá os detalhes do passageiro e localização via WhatsApp.
              </p>
            </>
          ) : null}
          <Button onClick={handleAccept} disabled={loading || rideDetailsQuery.isLoading} className="w-full h-14 text-lg rounded-xl font-semibold">
            {loading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2 w-5 h-5" />}
            Aceitar Corrida
          </Button>
          <Button variant="outline" onClick={() => navigate("/")} className="w-full h-12 rounded-xl">
            Voltar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
