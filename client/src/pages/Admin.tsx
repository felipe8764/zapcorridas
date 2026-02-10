import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  BarChart3, Users, Car, MapPin, Plus, Search, Loader2,
  LogOut, Bell, MessageSquare, Activity, CheckCircle, X,
  Menu as MenuIcon, ChevronRight, Edit2, Save, Phone, FileText
} from "lucide-react";

const statusLabels: Record<string, string> = {
  waiting: "Aguardando",
  accepted: "Aceita",
  in_progress: "Em andamento",
  completed: "Concluída",
  cancelled_by_passenger: "Canc. Passageiro",
  cancelled_by_driver: "Canc. Motorista",
};

const statusColors: Record<string, string> = {
  waiting: "bg-yellow-100 text-yellow-800",
  accepted: "bg-blue-100 text-blue-800",
  in_progress: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled_by_passenger: "bg-red-100 text-red-800",
  cancelled_by_driver: "bg-red-100 text-red-800",
};

export default function Admin() {
  const [tab, setTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchPassengers, setSearchPassengers] = useState("");
  const [searchDrivers, setSearchDrivers] = useState("");
  const [rideFilter, setRideFilter] = useState<string>("all");

  // Templates state
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [editingTemplateContent, setEditingTemplateContent] = useState("");

  // Queries
  const statsQuery = trpc.admin.getStats.useQuery();
  const passengersQuery = trpc.admin.listPassengers.useQuery({ search: searchPassengers || undefined });
  const driversQuery = trpc.admin.listDrivers.useQuery({ search: searchDrivers || undefined });
  const ridesQuery = trpc.admin.listRides.useQuery(rideFilter !== "all" ? { status: rideFilter } : undefined);
  const notificationsQuery = trpc.admin.listNotifications.useQuery();
  const templatesQuery = trpc.admin.listTemplates.useQuery();

  // Mutations
  const createDriver = trpc.admin.createDriver.useMutation({ onSuccess: () => { driversQuery.refetch(); toast.success("Motorista cadastrado!"); } });
  const updateDriver = trpc.admin.updateDriver.useMutation({ onSuccess: () => { driversQuery.refetch(); toast.success("Motorista atualizado!"); } });
  const updatePassenger = trpc.admin.updatePassenger.useMutation({ onSuccess: () => { passengersQuery.refetch(); toast.success("Passageiro atualizado!"); } });
  const createNotification = trpc.admin.createNotification.useMutation({ onSuccess: () => { notificationsQuery.refetch(); toast.success("Notificação criada!"); } });
  const updateNotification = trpc.admin.updateNotification.useMutation({ onSuccess: () => { notificationsQuery.refetch(); } });
  const deleteNotification = trpc.admin.deleteNotification.useMutation({ onSuccess: () => { notificationsQuery.refetch(); toast.success("Notificação removida!"); } });
  const updateTemplate = trpc.admin.updateTemplate.useMutation({
    onSuccess: () => { templatesQuery.refetch(); setEditingTemplateId(null); toast.success("Template atualizado!"); },
    onError: (e) => toast.error(e.message),
  });

  const stats = statsQuery.data;

  // Form states
  const [newDriver, setNewDriver] = useState({ phone: "", name: "", carModel: "", carColor: "", plate: "", expiresAt: "" });
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any>(null);
  const [editingPassenger, setEditingPassenger] = useState<any>(null);
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

  const handleSaveTemplate = async (id: number) => {
    if (!editingTemplateContent.trim()) { toast.error("O template não pode estar vazio"); return; }
    await updateTemplate.mutateAsync({ id, template: editingTemplateContent });
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "passengers", label: "Passageiros", icon: Users },
    { id: "drivers", label: "Motoristas", icon: Car },
    { id: "rides", label: "Corridas", icon: MapPin },
    { id: "notifications", label: "Notificações", icon: Bell },
    { id: "templates", label: "Mensagens WhatsApp", icon: MessageSquare },
  ];

  const variablesList = [
    { var: "{{code}}", desc: "Código de verificação" },
    { var: "{{nome_passageiro}}", desc: "Nome do passageiro" },
    { var: "{{telefone_passageiro}}", desc: "Telefone do passageiro" },
    { var: "{{nome_motorista}}", desc: "Nome do motorista" },
    { var: "{{telefone_motorista}}", desc: "Telefone do motorista" },
    { var: "{{origem}}", desc: "Endereço de origem" },
    { var: "{{destino}}", desc: "Endereço de destino" },
    { var: "{{distancia}}", desc: "Distância em km" },
    { var: "{{tempo}}", desc: "Tempo estimado (min)" },
    { var: "{{placa}}", desc: "Placa do veículo" },
    { var: "{{cor_carro}}", desc: "Cor do veículo" },
    { var: "{{modelo_carro}}", desc: "Modelo do veículo" },
    { var: "{{link_aceitar}}", desc: "Link para aceitar corrida" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <MenuIcon className="w-5 h-5 text-gray-700" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <Car className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-900 hidden sm:block">ZapCorridas</span>
              <span className="text-xs text-gray-400 hidden sm:block">Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 hidden sm:block">Painel Administrativo</span>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
          <nav
            className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                  <Car className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">ZapCorridas</h2>
                  <p className="text-xs text-gray-400">Painel Administrativo</p>
                </div>
              </div>
            </div>
            <div className="p-3 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = tab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setTab(item.id); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? "text-emerald-600" : "text-gray-400"}`} />
                    {item.label}
                    {isActive && <ChevronRight className="w-4 h-4 ml-auto text-emerald-400" />}
                  </button>
                );
              })}
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
              <button
                onClick={() => { window.location.href = "/"; }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
              >
                <LogOut className="w-5 h-5" />
                Sair do Painel
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Tab Pills - Scrollable on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-emerald-300 hover:text-emerald-600"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* ==================== DASHBOARD ==================== */}
        {tab === "dashboard" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            {statsQuery.isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-600" /></div>
            ) : stats ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                  { label: "Passageiros", value: stats.totalPassengers, icon: Users, color: "text-blue-600 bg-blue-50" },
                  { label: "Motoristas", value: stats.totalDrivers, icon: Car, color: "text-emerald-600 bg-emerald-50" },
                  { label: "Total Corridas", value: stats.totalRides, icon: MapPin, color: "text-purple-600 bg-purple-50" },
                  { label: "Hoje", value: stats.ridesToday, icon: Activity, color: "text-orange-600 bg-orange-50" },
                  { label: "Concluídas", value: stats.ridesByStatus?.find((r: any) => r.status === "completed")?.count || 0, icon: CheckCircle, color: "text-green-600 bg-green-50" },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <Card key={stat.label} className="border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : null}
          </div>
        )}

        {/* ==================== PASSAGEIROS ==================== */}
        {tab === "passengers" && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-gray-900">Passageiros</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={searchPassengers}
                onChange={(e) => setSearchPassengers(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
            {passengersQuery.isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-600" /></div>
            ) : (
              <div className="space-y-2">
                {passengersQuery.data?.length === 0 && (
                  <div className="text-center py-12 text-gray-400">Nenhum passageiro encontrado</div>
                )}
                {passengersQuery.data?.map((p: any) => (
                  <Card key={p.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{p.name}</p>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Phone className="w-3 h-3" />
                            <span>{p.phone}</span>
                          </div>
                          <p className="text-xs text-gray-400">{p.totalRides} corridas</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="text-xs" onClick={() => setEditingPassenger(p)}>
                                <Edit2 className="w-3 h-3" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md mx-4">
                              <DialogHeader><DialogTitle>Editar Passageiro</DialogTitle></DialogHeader>
                              {editingPassenger && (
                                <div className="space-y-3">
                                  <div><Label className="text-xs">Nome</Label><Input value={editingPassenger.name} onChange={(e) => setEditingPassenger({ ...editingPassenger, name: e.target.value })} /></div>
                                  <Button onClick={() => { updatePassenger.mutateAsync({ id: editingPassenger.id, name: editingPassenger.name }); setEditingPassenger(null); }} className="w-full bg-emerald-600 hover:bg-emerald-700">
                                    Salvar
                                  </Button>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant={p.isBlocked ? "destructive" : "outline"}
                            size="sm"
                            className="shrink-0 text-xs"
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
          </div>
        )}

        {/* ==================== MOTORISTAS ==================== */}
        {tab === "drivers" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Motoristas</h1>
              <Dialog open={driverDialogOpen} onOpenChange={setDriverDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="w-4 h-4 mr-1" /> Novo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md mx-4">
                  <DialogHeader><DialogTitle>Cadastrar Motorista</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label className="text-xs">Telefone</Label><Input placeholder="11999999999" value={newDriver.phone} onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })} /></div>
                    <div><Label className="text-xs">Nome</Label><Input placeholder="João Silva" value={newDriver.name} onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">Modelo</Label><Input placeholder="Corolla" value={newDriver.carModel} onChange={(e) => setNewDriver({ ...newDriver, carModel: e.target.value })} /></div>
                      <div><Label className="text-xs">Cor</Label><Input placeholder="Preto" value={newDriver.carColor} onChange={(e) => setNewDriver({ ...newDriver, carColor: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">Placa</Label><Input placeholder="ABC1234" value={newDriver.plate} onChange={(e) => setNewDriver({ ...newDriver, plate: e.target.value })} /></div>
                      <div><Label className="text-xs">Vencimento</Label><Input type="date" value={newDriver.expiresAt} onChange={(e) => setNewDriver({ ...newDriver, expiresAt: e.target.value })} /></div>
                    </div>
                    <Button onClick={handleCreateDriver} disabled={createDriver.isPending} className="w-full bg-emerald-600 hover:bg-emerald-700">
                      {createDriver.isPending ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : null}
                      Cadastrar Motorista
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Buscar motorista..." value={searchDrivers} onChange={(e) => setSearchDrivers(e.target.value)} className="pl-10 bg-white" />
            </div>
            {driversQuery.isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-600" /></div>
            ) : (
              <div className="space-y-2">
                {driversQuery.data?.length === 0 && (
                  <div className="text-center py-12 text-gray-400">Nenhum motorista encontrado</div>
                )}
                {driversQuery.data?.map((d: any) => (
                  <Card key={d.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                          <Car className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900 truncate">{d.name}</p>
                            {d.isBlocked && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Bloqueado</Badge>}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Phone className="w-3 h-3" />
                            <span>{d.phone}</span>
                          </div>
                          <p className="text-xs text-gray-400">{d.carModel} {d.carColor} | {d.plate}</p>
                          <p className="text-xs text-gray-400">Vence: {new Date(d.expiresAt).toLocaleDateString("pt-BR")}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="text-xs" onClick={() => setEditingDriver(d)}>
                                <Edit2 className="w-3 h-3" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md mx-4">
                              <DialogHeader><DialogTitle>Editar Motorista</DialogTitle></DialogHeader>
                              {editingDriver && (
                                <div className="space-y-3">
                                  <div><Label className="text-xs">Nome</Label><Input value={editingDriver.name} onChange={(e) => setEditingDriver({ ...editingDriver, name: e.target.value })} /></div>
                                  <div><Label className="text-xs">Modelo</Label><Input value={editingDriver.carModel} onChange={(e) => setEditingDriver({ ...editingDriver, carModel: e.target.value })} /></div>
                                  <div><Label className="text-xs">Cor</Label><Input value={editingDriver.carColor} onChange={(e) => setEditingDriver({ ...editingDriver, carColor: e.target.value })} /></div>
                                  <div><Label className="text-xs">Placa</Label><Input value={editingDriver.plate} onChange={(e) => setEditingDriver({ ...editingDriver, plate: e.target.value })} /></div>
                                  <div><Label className="text-xs">Vencimento</Label><Input type="date" value={editingDriver.expiresAt instanceof Date ? editingDriver.expiresAt.toISOString().split('T')[0] : typeof editingDriver.expiresAt === 'string' ? editingDriver.expiresAt.split('T')[0] : ''} onChange={(e) => setEditingDriver({ ...editingDriver, expiresAt: e.target.value })} /></div>
                                  <Button onClick={() => { updateDriver.mutateAsync({ id: editingDriver.id, name: editingDriver.name, carModel: editingDriver.carModel, carColor: editingDriver.carColor, plate: editingDriver.plate, expiresAt: editingDriver.expiresAt }); setEditingDriver(null); }} className="w-full bg-emerald-600 hover:bg-emerald-700">
                                    Salvar
                                  </Button>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant={d.isBlocked ? "destructive" : "outline"}
                            size="sm"
                            className="shrink-0 text-xs"
                            onClick={() => updateDriver.mutateAsync({ id: d.id, isBlocked: !d.isBlocked })}
                          >
                            {d.isBlocked ? "Desbloquear" : "Bloquear"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== CORRIDAS ==================== */}
        {tab === "rides" && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-gray-900">Corridas</h1>
            <div className="overflow-x-auto">
              <Select value={rideFilter} onValueChange={setRideFilter}>
                <SelectTrigger className="bg-white w-full sm:w-64">
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
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-600" /></div>
            ) : (
              <div className="space-y-2">
                {ridesQuery.data?.length === 0 && (
                  <div className="text-center py-12 text-gray-400">Nenhuma corrida encontrada</div>
                )}
                {ridesQuery.data?.map((r: any) => (
                  <Card key={r.id} className="border-0 shadow-sm">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[r.status] || "bg-gray-100 text-gray-600"}`}>
                              {statusLabels[r.status] || r.status}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(r.createdAt).toLocaleDateString("pt-BR")} {new Date(r.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {r.originAddress}
                          </p>
                          <p className="text-sm text-gray-600 truncate">
                            <span className="text-gray-400">→</span> {r.destinationAddress}
                          </p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {r.passengerName}
                              {r.passengerPhone && <span className="text-gray-400">({r.passengerPhone})</span>}
                            </span>
                            {r.driverName && (
                              <span className="flex items-center gap-1">
                                <Car className="w-3 h-3" />
                                {r.driverName}
                                {r.driverPhone && <span className="text-gray-400">({r.driverPhone})</span>}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-3 text-xs text-gray-400">
                            <span>{r.distanceKm}km</span>
                            <span>{r.durationMinutes}min</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== NOTIFICAÇÕES ==================== */}
        {tab === "notifications" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Notificações</h1>
              <Dialog open={notifDialog} onOpenChange={setNotifDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="w-4 h-4 mr-1" /> Nova
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md mx-4">
                  <DialogHeader><DialogTitle>Criar Notificação</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label className="text-xs">Título</Label><Input placeholder="Título da notificação" value={newNotif.title} onChange={(e) => setNewNotif({ ...newNotif, title: e.target.value })} /></div>
                    <div><Label className="text-xs">Mensagem</Label><Textarea placeholder="Mensagem da notificação" value={newNotif.message} onChange={(e) => setNewNotif({ ...newNotif, message: e.target.value })} /></div>
                    <div>
                      <Label className="text-xs">Destinatários</Label>
                      <Select value={newNotif.target} onValueChange={(val) => setNewNotif({ ...newNotif, target: val as any })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="passengers">Passageiros</SelectItem>
                          <SelectItem value="drivers">Motoristas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleCreateNotification} disabled={createNotification.isPending} className="w-full bg-emerald-600 hover:bg-emerald-700">
                      {createNotification.isPending ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : null}
                      Criar Notificação
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {notificationsQuery.isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-600" /></div>
            ) : (
              <div className="space-y-2">
                {notificationsQuery.data?.length === 0 && (
                  <div className="text-center py-12 text-gray-400">Nenhuma notificação criada</div>
                )}
                {notificationsQuery.data?.map((n: any) => (
                  <Card key={n.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                          <Bell className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900">{n.title}</p>
                          <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-1">Para: {n.target === "all" ? "Todos" : n.target === "passengers" ? "Passageiros" : "Motoristas"}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Switch
                            checked={n.isActive}
                            onCheckedChange={(checked) => updateNotification.mutateAsync({ id: n.id, isActive: checked })}
                          />
                          <button
                            onClick={() => deleteNotification.mutateAsync({ id: n.id })}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== TEMPLATES DE MENSAGENS ==================== */}
        {tab === "templates" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mensagens WhatsApp</h1>
              <p className="text-sm text-gray-500 mt-1">
                Edite os modelos de mensagens enviadas automaticamente via WhatsApp. Use variáveis dinâmicas entre chaves duplas.
              </p>
            </div>

            {/* Variáveis disponíveis - collapsible */}
            <details className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                Variáveis disponíveis para uso nos templates
              </summary>
              <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {variablesList.map((v) => (
                  <div key={v.var} className="flex items-center gap-2 text-xs">
                    <code className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded font-mono text-[11px]">{v.var}</code>
                    <span className="text-gray-500">{v.desc}</span>
                  </div>
                ))}
              </div>
            </details>

            {/* Templates list */}
            {templatesQuery.isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-600" /></div>
            ) : (
              <div className="space-y-3">
                {templatesQuery.data?.length === 0 && (
                  <div className="text-center py-12 text-gray-400">Nenhum template encontrado</div>
                )}
                {templatesQuery.data?.map((template: any) => (
                  <Card key={template.id} className="border-0 shadow-sm overflow-hidden">
                    <CardContent className="p-0">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-emerald-600" />
                          <span className="font-medium text-sm text-gray-900">{template.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={template.isActive}
                            onCheckedChange={() => updateTemplate.mutateAsync({ id: template.id, isActive: !template.isActive })}
                            disabled={updateTemplate.isPending}
                          />
                        </div>
                      </div>
                      <div className="p-4">
                        {template.description && (
                          <p className="text-xs text-gray-400 mb-2">{template.description}</p>
                        )}
                        {editingTemplateId === template.id ? (
                          <div className="space-y-3">
                            <Textarea
                              value={editingTemplateContent}
                              onChange={(e) => setEditingTemplateContent(e.target.value)}
                              className="min-h-32 text-sm font-mono bg-gray-50"
                              placeholder="Digite o conteúdo do template..."
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleSaveTemplate(template.id)}
                                disabled={updateTemplate.isPending}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                              >
                                {updateTemplate.isPending ? <Loader2 className="animate-spin w-4 h-4 mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                                Salvar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingTemplateId(null)}
                                disabled={updateTemplate.isPending}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <pre className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap break-words font-sans leading-relaxed">
                              {template.template}
                            </pre>
                            {template.variables && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {template.variables.split(",").map((v: string) => (
                                  <span key={v} className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">
                                    {`{{${v.trim()}}}`}
                                  </span>
                                ))}
                              </div>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setEditingTemplateId(template.id); setEditingTemplateContent(template.template); }}
                              disabled={updateTemplate.isPending}
                              className="w-full mt-3"
                            >
                              <Edit2 className="w-4 h-4 mr-1" />
                              Editar Mensagem
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
