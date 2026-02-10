import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Car, LogOut, History, Loader2, MapPin, Clock, Route, Phone, User,
  Play, CheckCircle, X, ArrowLeft, Navigation, Bell, Shield
} from "lucide-react";

type Session = {
  userType: "driver";
  userId: number;
  phone: string;
  name: string;
  driver: any;
};

type View = "dashboard" | "history";

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  const withoutCountry = cleaned.length > 11 ? cleaned.slice(-11) : cleaned;
  if (withoutCountry.length === 11) {
    return `(${withoutCountry.slice(0, 2)}) ${withoutCountry.slice(2, 7)}-${withoutCountry.slice(7)}`;
  }
  return phone;
}

export default function DriverArea({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const [view, setView] = useState<View>("dashboard");
  const [loading, setLoading] = useState(false);

  const activeRideQuery = trpc.driver.getActiveRide.useQuery(
    { driverId: session.userId },
    { refetchInterval: 5000 }
  );
  const historyQuery = trpc.driver.getRideHistory.useQuery({ driverId: session.userId });
  const notificationsQuery = trpc.driver.getNotifications.useQuery();

  const startRide = trpc.driver.startRide.useMutation();
  const completeRide = trpc.driver.completeRide.useMutation();
  const cancelRide = trpc.driver.cancelRide.useMutation();

  const activeRide = activeRideQuery.data;
  const notifications = notificationsQuery.data || [];

  const statusLabels: Record<string, { label: string; color: string; icon: any }> = {
    waiting: { label: "Aguardando", color: "bg-yellow-100 text-yellow-800", icon: Clock },
    accepted: { label: "Aceita", color: "bg-blue-100 text-blue-800", icon: Navigation },
    in_progress: { label: "Em andamento", color: "bg-green-100 text-green-800", icon: Car },
    completed: { label: "Concluída", color: "bg-gray-100 text-gray-800", icon: CheckCircle },
    cancelled_by_passenger: { label: "Cancelada", color: "bg-red-100 text-red-800", icon: X },
    cancelled_by_driver: { label: "Cancelada", color: "bg-red-100 text-red-800", icon: X },
  };

  const handleStartRide = async () => {
    if (!activeRide) return;
    setLoading(true);
    try {
      await startRide.mutateAsync({ rideId: activeRide.id, driverId: session.userId });
      toast.success("Corrida iniciada!");
      activeRideQuery.refetch();
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  const handleCompleteRide = async () => {
    if (!activeRide) return;
    setLoading(true);
    try {
      await completeRide.mutateAsync({ rideId: activeRide.id, driverId: session.userId });
      toast.success("Corrida finalizada!");
      activeRideQuery.refetch();
      historyQuery.refetch();
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  const handleCancelRide = async () => {
    if (!activeRide) return;
    setLoading(true);
    try {
      await cancelRide.mutateAsync({ rideId: activeRide.id, driverId: session.userId });
      toast.success("Corrida cancelada");
      activeRideQuery.refetch();
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  const expiresAt = new Date(session.driver.expiresAt);
  const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-lg">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            {view !== "dashboard" && (
              <Button variant="ghost" size="icon" onClick={() => setView("dashboard")} className="text-primary-foreground hover:bg-white/20">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <Car className="w-5 h-5" />
            <h1 className="font-bold text-lg">Motorista</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => { historyQuery.refetch(); setView("history"); }} className="text-primary-foreground hover:bg-white/20">
              <History className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onLogout} className="text-primary-foreground hover:bg-white/20">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
          {notifications.map((n: any) => (
            <div key={n.id} className="flex items-start gap-2 py-1">
              <Bell className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800">{n.title}</p>
                <p className="text-xs text-yellow-700">{n.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "dashboard" && (
        <div className="px-4 py-4 space-y-4">
          {/* Driver Info Card */}
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Olá, motorista</p>
                  <p className="font-bold text-lg">{session.name}</p>
                </div>
                <div className="text-right">
                  <Badge variant={daysLeft > 7 ? "default" : "destructive"} className="text-xs">
                    {daysLeft > 0 ? `${daysLeft} dias restantes` : "Conta vencida"}
                  </Badge>
                </div>
              </div>
              <Separator className="my-3" />
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{session.driver.totalRides}</p>
                  <p className="text-xs text-muted-foreground">Corridas</p>
                </div>
                <div>
                  <p className="text-sm font-medium">{session.driver.carModel}</p>
                  <p className="text-xs text-muted-foreground">{session.driver.carColor}</p>
                </div>
                <div>
                  <p className="text-sm font-bold">{session.driver.plate}</p>
                  <p className="text-xs text-muted-foreground">Placa</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Ride */}
          {activeRide ? (
            <Card className="shadow-lg border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Corrida Ativa</CardTitle>
                  <Badge className={statusLabels[activeRide.status]?.color || ""}>{statusLabels[activeRide.status]?.label}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Passenger info */}
                {activeRide.passengerInfo && (
                  <div className="bg-primary/5 rounded-xl p-4 space-y-2">
                    <p className="text-sm font-semibold text-primary">Passageiro</p>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{activeRide.passengerInfo.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{formatPhone(activeRide.passengerInfo.phone)}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Origem</p>
                      <p className="text-sm font-medium">{activeRide.originAddress}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Destino</p>
                      <p className="text-sm font-medium">{activeRide.destinationAddress}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Distância: <strong>{activeRide.distanceKm} km</strong></span>
                  <span className="text-muted-foreground">Tempo: <strong>{activeRide.durationMinutes} min</strong></span>
                </div>

                {/* Action buttons */}
                <div className="space-y-2">
                  {activeRide.status === "accepted" && (
                    <Button onClick={handleStartRide} disabled={loading} className="w-full h-14 text-lg rounded-xl font-semibold">
                      {loading ? <Loader2 className="animate-spin mr-2" /> : <Play className="mr-2 w-5 h-5" />}
                      Iniciar Corrida
                    </Button>
                  )}
                  {activeRide.status === "in_progress" && (
                    <Button onClick={handleCompleteRide} disabled={loading} className="w-full h-14 text-lg rounded-xl font-semibold bg-green-600 hover:bg-green-700">
                      {loading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2 w-5 h-5" />}
                      Finalizar Corrida
                    </Button>
                  )}
                  {(activeRide.status === "accepted" || activeRide.status === "in_progress") && (
                    <Button variant="destructive" onClick={handleCancelRide} disabled={loading} className="w-full h-12 rounded-xl">
                      <X className="mr-2 w-4 h-4" /> Cancelar Corrida
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-sm">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Disponível para corridas</h3>
                <p className="text-sm text-muted-foreground">Quando um passageiro solicitar uma corrida, você receberá uma notificação no WhatsApp com o link para aceitar.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* History View */}
      {view === "history" && (
        <div className="px-4 py-4 space-y-3">
          <h2 className="text-lg font-semibold">Histórico de Corridas</h2>
          {historyQuery.isLoading && <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>}
          {historyQuery.data?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma corrida encontrada</p>
            </div>
          )}
          {historyQuery.data?.map((ride: any) => (
            <Card key={ride.id} className="shadow-sm">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{new Date(ride.createdAt).toLocaleString("pt-BR")}</span>
                  <Badge className={statusLabels[ride.status]?.color || ""} variant="secondary">{statusLabels[ride.status]?.label}</Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                    <p className="text-sm truncate">{ride.originAddress}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                    <p className="text-sm truncate">{ride.destinationAddress}</p>
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                  <span>{ride.distanceKm} km</span>
                  <span>{ride.durationMinutes} min</span>
                  {ride.passengerInfo && <span>Passageiro: {ride.passengerInfo.name}</span>}
                  {ride.passengerInfo && <span>Tel: {formatPhone(ride.passengerInfo.phone)}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
