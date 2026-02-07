import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  BarChart3, Users, Car, MapPin, Clock, Plus, Search, Loader2,
  LogOut, Bell, Shield, TrendingUp, Activity, CheckCircle, X, AlertCircle, Eye
} from "lucide-react";

export default function Admin() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState("dashboard");
  const [searchPassengers, setSearchPassengers] = useState("");
  const [searchDrivers, setSearchDrivers] = useState("");
  const [rideFilter, setRideFilter] = useState<string>("all");

  // Queries
  const statsQuery = trpc.admin.getStats.useQuery();
  const passengersQuery = trpc.admin.listPassengers.useQuery({ search: searchPassengers || undefined });
  const driversQuery = trpc.admin.listDrivers.useQuery({ search: searchDrivers || undefined });
  const ridesQuery = trpc.admin.listRides.useQuery(rideFilter !== "all" ? { status: rideFilter } : undefined);
  const notificationsQuery = trpc.admin.listNotifications.useQuery();

  // Mutations
  const createDriver = trpc.admin.createDriver.useMutation({ onSuccess: () => { driversQuery.refetch(); toast.success("Motorista cadastrado!"); } });
  const updateDriver = trpc.admin.updateDriver.useMutation({ onSuccess: () => { driversQuery.refetch(); toast.success("Motorista atualizado!"); } });
  const updatePassenger = trpc.admin.updatePassenger.useMutation({ onSuccess: () => { passengersQuery.refetch(); toast.success("Passageiro atualizado!"); } });
  const createNotification = trpc.admin.createNotification.useMutation({ onSuccess: () => { notificationsQuery.refetch(); toast.success("Notificação criada!"); } });
  const updateNotification = trpc.admin.updateNotification.useMutation({ onSuccess: () => { notificationsQuery.refetch(); } });
  const deleteNotification = trpc.admin.deleteNotification.useMutation({ onSuccess: () => { notificationsQuery.refetch(); toast.success("Notificação removida!"); } });

  const stats = statsQuery.data;

  // New driver form state
  const [newDriver, setNewDriver] = useState({ phone: "", name: "", carModel: "", carColor: "", plate: "", expiresAt: "" });
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  const [notifDialog, setNotifDialog] = useState(false);
  const [newNotif, setNewNotif] = useState({ title: "", message: "", target: "all" as "all" | "passengers" | "drivers" });

  const handleCreateDriver = async () => {
    if (!newDriver.phone || !newDriver.name || !newDriver.carModel || !newDriver.carColor || !newDriver.plate || !newDriver.expiresAt) {
      toast.error("Preencha todos os campos"); return;
    }
    try {
      await createDriver.mutateAsync({ ...newDriver, phone: "55" + newDriver.phone.replace(/\D/g, "") });
      setDriverDialogOpen(false);
      setNewDriver({ phone: "", name: "", carModel: "", carColor: "", plate: "", expiresAt: "" });
    } catch (e: any) { toast.error(e.message); }
  };

  const handleCreateNotification = async () => {
    if (!newNotif.title || !newNotif.message) { toast.error("Preencha todos os campos"); return; }
    try {
      await createNotification.mutateAsync(newNotif);
      setNotifDialog(false);
      setNewNotif({ title: "", message: "", target: "all" });
    } catch (e: any) { toast.error(e.message); }
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    waiting: { label: "Aguardando", color: "bg-yellow-100 text-yellow-800" },
    accepted: { label: "Aceita", color: "bg-blue-100 text-blue-800" },
    in_progress: { label: "Em andamento", color: "bg-green-100 text-green-800" },
    completed: { label: "Concluída", color: "bg-gray-100 text-gray-800" },
    cancelled_by_passenger: { label: "Canc. passageiro", color: "bg-red-100 text-red-800" },
    cancelled_by_driver: { label: "Canc. motorista", color: "bg-red-100 text-red-800" },
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b shadow-sm">
        <div className="flex items-center justify-between px-4 h-14 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-lg">ZapCorridas Admin</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.name}</span>
            <Button variant="ghost" size="icon" onClick={() => logout()}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full grid grid-cols-5 mb-6">
            <TabsTrigger value="dashboard" className="text-xs sm:text-sm"><BarChart3 className="w-4 h-4 mr-1 hidden sm:block" />Dashboard</TabsTrigger>
            <TabsTrigger value="rides" className="text-xs sm:text-sm"><MapPin className="w-4 h-4 mr-1 hidden sm:block" />Corridas</TabsTrigger>
            <TabsTrigger value="passengers" className="text-xs sm:text-sm"><Users className="w-4 h-4 mr-1 hidden sm:block" />Passageiros</TabsTrigger>
            <TabsTrigger value="drivers" className="text-xs sm:text-sm"><Car className="w-4 h-4 mr-1 hidden sm:block" />Motoristas</TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs sm:text-sm"><Bell className="w-4 h-4 mr-1 hidden sm:block" />Avisos</TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-4">
            {statsQuery.isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
            ) : stats ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Corridas</p>
                          <p className="text-3xl font-bold">{stats.totalRides}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <MapPin className="w-6 h-6 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Corridas Hoje</p>
                          <p className="text-3xl font-bold">{stats.ridesToday}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                          <TrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Passageiros</p>
                          <p className="text-3xl font-bold">{stats.totalPassengers}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                          <Users className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Motoristas</p>
                          <p className="text-3xl font-bold">{stats.totalDrivers}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                          <Car className="w-6 h-6 text-orange-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Status breakdown */}
                <Card className="shadow-sm">
                  <CardHeader><CardTitle className="text-base">Corridas por Status</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {stats.ridesByStatus.map((s: any) => (
                        <div key={s.status} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <Badge className={statusLabels[s.status]?.color || ""} variant="secondary">{statusLabels[s.status]?.label || s.status}</Badge>
                          <span className="font-bold text-lg">{s.count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </TabsContent>

          {/* Rides */}
          <TabsContent value="rides" className="space-y-4">
            <div className="flex items-center gap-3">
              <Select value={rideFilter} onValueChange={setRideFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="waiting">Aguardando</SelectItem>
                  <SelectItem value="accepted">Aceitas</SelectItem>
                  <SelectItem value="in_progress">Em andamento</SelectItem>
                  <SelectItem value="completed">Concluídas</SelectItem>
                  <SelectItem value="cancelled_by_passenger">Canc. passageiro</SelectItem>
                  <SelectItem value="cancelled_by_driver">Canc. motorista</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {ridesQuery.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
            ) : (
              <div className="space-y-3">
                {ridesQuery.data?.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma corrida encontrada</p>}
                {ridesQuery.data?.map((ride: any) => (
                  <Card key={ride.id} className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">#{ride.id}</span>
                          <Badge className={statusLabels[ride.status]?.color || ""} variant="secondary">{statusLabels[ride.status]?.label}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(ride.createdAt).toLocaleString("pt-BR")}</span>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Passageiro: </span>
                          <span className="font-medium">{ride.passengerName}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Motorista: </span>
                          <span className="font-medium">{ride.driverName || "—"}</span>
                        </div>
                      </div>
                      <div className="mt-2 space-y-1 text-sm">
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                          <span className="truncate">{ride.originAddress}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                          <span className="truncate">{ride.destinationAddress}</span>
                        </div>
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{ride.distanceKm} km</span>
                        <span>{ride.durationMinutes} min</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Passengers */}
          <TabsContent value="passengers" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar passageiro..." value={searchPassengers} onChange={(e) => setSearchPassengers(e.target.value)} className="pl-10" />
            </div>
            {passengersQuery.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
            ) : (
              <div className="space-y-3">
                {passengersQuery.data?.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum passageiro encontrado</p>}
                {passengersQuery.data?.map((p: any) => (
                  <Card key={p.id} className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-sm text-muted-foreground">{p.phone}</p>
                          <p className="text-xs text-muted-foreground">{p.totalRides} corridas | Desde {new Date(p.createdAt).toLocaleDateString("pt-BR")}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={p.isBlocked ? "destructive" : "default"}>{p.isBlocked ? "Bloqueado" : "Ativo"}</Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updatePassenger.mutateAsync({ id: p.id, isBlocked: !p.isBlocked })}
                          >
                            {p.isBlocked ? "Desbloquear" : "Bloquear"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Drivers */}
          <TabsContent value="drivers" className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar motorista..." value={searchDrivers} onChange={(e) => setSearchDrivers(e.target.value)} className="pl-10" />
              </div>
              <Dialog open={driverDialogOpen} onOpenChange={setDriverDialogOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-1" /> Novo</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Cadastrar Motorista</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Telefone (DDD + número)</Label><Input placeholder="11999999999" value={newDriver.phone} onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })} /></div>
                    <div><Label>Nome Completo</Label><Input value={newDriver.name} onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Modelo do Carro</Label><Input placeholder="Gol 2020" value={newDriver.carModel} onChange={(e) => setNewDriver({ ...newDriver, carModel: e.target.value })} /></div>
                      <div><Label>Cor</Label><Input placeholder="Branco" value={newDriver.carColor} onChange={(e) => setNewDriver({ ...newDriver, carColor: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Placa</Label><Input placeholder="ABC-1234" value={newDriver.plate} onChange={(e) => setNewDriver({ ...newDriver, plate: e.target.value })} /></div>
                      <div><Label>Validade</Label><Input type="date" value={newDriver.expiresAt} onChange={(e) => setNewDriver({ ...newDriver, expiresAt: e.target.value })} /></div>
                    </div>
                    <Button onClick={handleCreateDriver} disabled={createDriver.isPending} className="w-full">
                      {createDriver.isPending ? <Loader2 className="animate-spin mr-2" /> : null}
                      Cadastrar Motorista
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {driversQuery.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
            ) : (
              <div className="space-y-3">
                {driversQuery.data?.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum motorista encontrado</p>}
                {driversQuery.data?.map((d: any) => {
                  const exp = new Date(d.expiresAt);
                  const daysLeft = Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return (
                    <Card key={d.id} className="shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{d.name}</p>
                            <p className="text-sm text-muted-foreground">{d.phone}</p>
                            <p className="text-xs text-muted-foreground">{d.carModel} - {d.carColor} | Placa: {d.plate}</p>
                            <p className="text-xs text-muted-foreground">{d.totalRides} corridas | {daysLeft > 0 ? `${daysLeft} dias restantes` : "Vencido"}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex gap-1">
                              <Badge variant={d.isBlocked ? "destructive" : daysLeft <= 0 ? "destructive" : "default"}>
                                {d.isBlocked ? "Bloqueado" : daysLeft <= 0 ? "Vencido" : d.isAvailable ? "Disponível" : "Em corrida"}
                              </Badge>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateDriver.mutateAsync({ id: d.id, isBlocked: !d.isBlocked })}
                            >
                              {d.isBlocked ? "Desbloquear" : "Bloquear"}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={notifDialog} onOpenChange={setNotifDialog}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-1" /> Nova Notificação</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Criar Notificação</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Título</Label><Input value={newNotif.title} onChange={(e) => setNewNotif({ ...newNotif, title: e.target.value })} /></div>
                    <div><Label>Mensagem</Label><Textarea value={newNotif.message} onChange={(e) => setNewNotif({ ...newNotif, message: e.target.value })} /></div>
                    <div>
                      <Label>Destinatários</Label>
                      <Select value={newNotif.target} onValueChange={(v) => setNewNotif({ ...newNotif, target: v as any })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="passengers">Passageiros</SelectItem>
                          <SelectItem value="drivers">Motoristas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleCreateNotification} disabled={createNotification.isPending} className="w-full">
                      {createNotification.isPending ? <Loader2 className="animate-spin mr-2" /> : null}
                      Criar Notificação
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {notificationsQuery.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
            ) : (
              <div className="space-y-3">
                {notificationsQuery.data?.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma notificação</p>}
                {notificationsQuery.data?.map((n: any) => (
                  <Card key={n.id} className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{n.title}</p>
                            <Badge variant="secondary">{n.target === "all" ? "Todos" : n.target === "passengers" ? "Passageiros" : "Motoristas"}</Badge>
                            <Badge variant={n.isActive ? "default" : "secondary"}>{n.isActive ? "Ativa" : "Inativa"}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{n.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString("pt-BR")}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" onClick={() => updateNotification.mutateAsync({ id: n.id, isActive: !n.isActive })}>
                            {n.isActive ? "Desativar" : "Ativar"}
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => deleteNotification.mutateAsync({ id: n.id })}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
