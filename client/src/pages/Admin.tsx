import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import TemplatesManager from "@/components/TemplatesManager";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  BarChart3, Users, Car, MapPin, Clock, Plus, Search, Loader2,
  LogOut, Bell, Shield, TrendingUp, Activity, CheckCircle, X, AlertCircle, Eye, Menu, ChevronDown
} from "lucide-react";

export default function Admin() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState("dashboard");
  const [searchPassengers, setSearchPassengers] = useState("");
  const [searchDrivers, setSearchDrivers] = useState("");
  const [rideFilter, setRideFilter] = useState<string>("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
    if (!newNotif.title || !newNotif.message) { toast.error("Preencha título e mensagem"); return; }
    try {
      await createNotification.mutateAsync(newNotif);
      setNotifDialog(false);
      setNewNotif({ title: "", message: "", target: "all" });
    } catch (e: any) { toast.error(e.message); }
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "passengers", label: "Passageiros", icon: Users },
    { id: "drivers", label: "Motoristas", icon: Car },
    { id: "rides", label: "Corridas", icon: MapPin },
    { id: "notifications", label: "Notificações", icon: Bell },
    { id: "templates", label: "Templates", icon: AlertCircle },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? "w-64" : "w-20"} bg-card border-r border-border transition-all duration-300 flex flex-col`}>
        <div className="p-4 flex items-center justify-between">
          {sidebarOpen && <h2 className="font-bold text-lg text-primary">ZapCorridas</h2>}
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="w-5 h-5" />
          </Button>
        </div>
        <Separator />
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={tab === item.id ? "default" : "ghost"}
                className={`w-full ${sidebarOpen ? "justify-start" : "justify-center"}`}
                onClick={() => setTab(item.id)}
              >
                <Icon className="w-5 h-5" />
                {sidebarOpen && <span className="ml-3">{item.label}</span>}
              </Button>
            );
          })}
        </nav>
        <Separator />
        <div className="p-4">
          <Button variant="destructive" className="w-full" onClick={logout}>
            <LogOut className="w-4 h-4" />
            {sidebarOpen && <span className="ml-2">Sair</span>}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {/* Dashboard */}
          {tab === "dashboard" && (
            <div className="space-y-6">
              <h1 className="text-3xl font-bold">Dashboard</h1>
              {statsQuery.isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
              ) : stats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-muted-foreground text-sm">Passageiros</p>
                          <p className="text-3xl font-bold">{stats.totalPassengers}</p>
                        </div>
                        <Users className="w-10 h-10 text-primary opacity-20" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-muted-foreground text-sm">Motoristas</p>
                          <p className="text-3xl font-bold">{stats.totalDrivers}</p>
                        </div>
                        <Car className="w-10 h-10 text-primary opacity-20" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-muted-foreground text-sm">Total Corridas</p>
                          <p className="text-3xl font-bold">{stats.totalRides}</p>
                        </div>
                        <MapPin className="w-10 h-10 text-primary opacity-20" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-muted-foreground text-sm">Hoje</p>
                          <p className="text-3xl font-bold">{stats.ridesToday}</p>
                        </div>
                        <Activity className="w-10 h-10 text-primary opacity-20" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-muted-foreground text-sm">Concluídas</p>
                          <p className="text-3xl font-bold">{stats.ridesByStatus?.find((r: any) => r.status === 'completed')?.count || 0}</p>
                        </div>
                        <CheckCircle className="w-10 h-10 text-primary opacity-20" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : null}
            </div>
          )}

          {/* Passengers */}
          {tab === "passengers" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Passageiros</h1>
              </div>
              <div className="flex gap-2">
                <Input placeholder="Buscar passageiro..." value={searchPassengers} onChange={(e) => setSearchPassengers(e.target.value)} className="max-w-xs" />
              </div>
              {passengersQuery.isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
              ) : (
                <div className="space-y-2">
                  {passengersQuery.data?.map((p: any) => (
                    <Card key={p.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold">{p.name}</p>
                          <p className="text-sm text-muted-foreground">{p.phone}</p>
                          <p className="text-xs text-muted-foreground">{p.totalRides} corridas</p>
                        </div>
                        <Button variant={p.isBlocked ? "destructive" : "outline"} size="sm" onClick={() => updatePassenger.mutateAsync({ id: p.id, isBlocked: !p.isBlocked })}>
                          {p.isBlocked ? "Desbloquear" : "Bloquear"}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Drivers */}
          {tab === "drivers" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Motoristas</h1>
                <Dialog open={driverDialogOpen} onOpenChange={setDriverDialogOpen}>
                  <DialogTrigger asChild>
                    <Button><Plus className="w-4 h-4 mr-2" /> Novo Motorista</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Cadastrar Motorista</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Telefone</Label>
                        <Input placeholder="11999999999" value={newDriver.phone} onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })} />
                      </div>
                      <div>
                        <Label>Nome</Label>
                        <Input placeholder="João Silva" value={newDriver.name} onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })} />
                      </div>
                      <div>
                        <Label>Modelo do Carro</Label>
                        <Input placeholder="Toyota Corolla" value={newDriver.carModel} onChange={(e) => setNewDriver({ ...newDriver, carModel: e.target.value })} />
                      </div>
                      <div>
                        <Label>Cor</Label>
                        <Input placeholder="Preto" value={newDriver.carColor} onChange={(e) => setNewDriver({ ...newDriver, carColor: e.target.value })} />
                      </div>
                      <div>
                        <Label>Placa</Label>
                        <Input placeholder="ABC1234" value={newDriver.plate} onChange={(e) => setNewDriver({ ...newDriver, plate: e.target.value })} />
                      </div>
                      <div>
                        <Label>Vencimento da Licença</Label>
                        <Input type="date" value={newDriver.expiresAt} onChange={(e) => setNewDriver({ ...newDriver, expiresAt: e.target.value })} />
                      </div>
                      <Button onClick={handleCreateDriver} disabled={createDriver.isPending} className="w-full">
                        {createDriver.isPending ? <Loader2 className="animate-spin mr-2" /> : null}
                        Cadastrar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="flex gap-2">
                <Input placeholder="Buscar motorista..." value={searchDrivers} onChange={(e) => setSearchDrivers(e.target.value)} className="max-w-xs" />
              </div>
              {driversQuery.isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
              ) : (
                <div className="space-y-2">
                  {driversQuery.data?.map((d: any) => (
                    <Card key={d.id}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-semibold">{d.name}</p>
                            <p className="text-sm text-muted-foreground">{d.phone}</p>
                            <p className="text-xs text-muted-foreground">{d.carModel} - {d.carColor} | {d.plate}</p>
                            <p className="text-xs text-muted-foreground">Vence: {new Date(d.expiresAt).toLocaleDateString("pt-BR")}</p>
                          </div>
                          <Button variant={d.isBlocked ? "destructive" : "outline"} size="sm" onClick={() => updateDriver.mutateAsync({ id: d.id, isBlocked: !d.isBlocked })}>
                            {d.isBlocked ? "Desbloquear" : "Bloquear"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Rides */}
          {tab === "rides" && (
            <div className="space-y-4">
              <h1 className="text-3xl font-bold">Corridas</h1>
              <div className="flex gap-2">
                <Select value={rideFilter} onValueChange={setRideFilter}>
                  <SelectTrigger className="max-w-xs">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="waiting">Aguardando</SelectItem>
                    <SelectItem value="accepted">Aceita</SelectItem>
                    <SelectItem value="in_progress">Em Progresso</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                    <SelectItem value="cancelled_by_passenger">Cancelada (Passageiro)</SelectItem>
                    <SelectItem value="cancelled_by_driver">Cancelada (Motorista)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {ridesQuery.isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
              ) : (
                <div className="space-y-2">
                  {ridesQuery.data?.map((r: any) => (
                    <Card key={r.id}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-semibold">{r.originAddress} → {r.destinationAddress}</p>
                            <p className="text-xs text-muted-foreground">Passageiro: {r.passengerName} ({r.passengerPhone})</p>
                            {r.driverName && <p className="text-xs text-muted-foreground">Motorista: {r.driverName} ({r.driverPhone})</p>}
                            <p className="text-xs text-muted-foreground">{r.distanceKm}km | {r.durationMinutes}min</p>
                          </div>
                          <Badge>{r.status}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notifications */}
          {tab === "notifications" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Notificações</h1>
                <Dialog open={notifDialog} onOpenChange={setNotifDialog}>
                  <DialogTrigger asChild>
                    <Button><Plus className="w-4 h-4 mr-2" /> Nova Notificação</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Criar Notificação</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Título</Label>
                        <Input placeholder="Título da notificação" value={newNotif.title} onChange={(e) => setNewNotif({ ...newNotif, title: e.target.value })} />
                      </div>
                      <div>
                        <Label>Mensagem</Label>
                        <Textarea placeholder="Mensagem da notificação" value={newNotif.message} onChange={(e) => setNewNotif({ ...newNotif, message: e.target.value })} />
                      </div>
                      <div>
                        <Label>Destinatários</Label>
                        <Select value={newNotif.target} onValueChange={(val) => setNewNotif({ ...newNotif, target: val as any })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="passengers">Passageiros</SelectItem>
                            <SelectItem value="drivers">Motoristas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleCreateNotification} disabled={createNotification.isPending} className="w-full">
                        {createNotification.isPending ? <Loader2 className="animate-spin mr-2" /> : null}
                        Criar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              {notificationsQuery.isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
              ) : (
                <div className="space-y-2">
                  {notificationsQuery.data?.map((n: any) => (
                    <Card key={n.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold">{n.title}</p>
                          <p className="text-sm text-muted-foreground">{n.message}</p>
                          <p className="text-xs text-muted-foreground">Para: {n.target}</p>
                        </div>
                        <div className="flex gap-2">
                          <Switch checked={n.isActive} onCheckedChange={(checked) => updateNotification.mutateAsync({ id: n.id, isActive: checked })} />
                          <Button variant="destructive" size="sm" onClick={() => deleteNotification.mutateAsync({ id: n.id })}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "templates" && (
            <div className="px-4 pb-6">
              <h2 className="text-lg font-semibold mb-4">Editar Templates de Mensagens WhatsApp</h2>
              <TemplatesManager />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
