import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  MapPin, Navigation, Clock, Route, Loader2, X, LogOut, History,
  Car, Phone, User, AlertCircle, CheckCircle, ArrowLeft, Crosshair, Bell
} from "lucide-react";

type Session = {
  userType: "passenger";
  userId: number;
  phone: string;
  name: string;
  passenger: any;
};

type View = "request" | "active" | "history";

export default function PassengerArea({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const [view, setView] = useState<View>("request");
  const [originText, setOriginText] = useState("");
  const [destText, setDestText] = useState("");
  const [origin, setOrigin] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [destination, setDestination] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distanceText: string; distanceKm: string; durationText: string; durationMinutes: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const mapRef = useRef<google.maps.Map | null>(null);
  const originAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const destAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const originInputRef = useRef<HTMLInputElement>(null);
  const destInputRef = useRef<HTMLInputElement>(null);

  const requestRide = trpc.passenger.requestRide.useMutation();
  const cancelRide = trpc.passenger.cancelRide.useMutation();
  const activeRideQuery = trpc.passenger.getActiveRide.useQuery(
    { passengerId: session.userId },
    { refetchInterval: 5000 }
  );
  const historyQuery = trpc.passenger.getRideHistory.useQuery({ passengerId: session.userId });
  const notificationsQuery = trpc.passenger.getNotifications.useQuery();

  const activeRide = activeRideQuery.data;

  useEffect(() => {
    if (activeRide) setView("active");
  }, [activeRide]);

  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    map.setOptions({ mapTypeControl: false, streetViewControl: false, fullscreenControl: false, zoomControl: true });

    directionsRendererRef.current = new google.maps.DirectionsRenderer({
      map,
      suppressMarkers: false,
      polylineOptions: { strokeColor: "#16a34a", strokeWeight: 5 },
    });

    // Setup autocomplete for origin
    if (originInputRef.current) {
      originAutocompleteRef.current = new google.maps.places.Autocomplete(originInputRef.current, {
        componentRestrictions: { country: "br" },
        fields: ["geometry", "formatted_address"],
      });
      originAutocompleteRef.current.addListener("place_changed", () => {
        const place = originAutocompleteRef.current!.getPlace();
        if (place.geometry?.location) {
          const loc = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng(), address: place.formatted_address || "" };
          setOrigin(loc);
          setOriginText(place.formatted_address || "");
        }
      });
    }

    // Setup autocomplete for destination
    if (destInputRef.current) {
      destAutocompleteRef.current = new google.maps.places.Autocomplete(destInputRef.current, {
        componentRestrictions: { country: "br" },
        fields: ["geometry", "formatted_address"],
      });
      destAutocompleteRef.current.addListener("place_changed", () => {
        const place = destAutocompleteRef.current!.getPlace();
        if (place.geometry?.location) {
          const loc = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng(), address: place.formatted_address || "" };
          setDestination(loc);
          setDestText(place.formatted_address || "");
        }
      });
    }
  }, []);

  const handleGPS = useCallback(() => {
    if (!navigator.geolocation) { toast.error("GPS não disponível"); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === "OK" && results?.[0]) {
            setOrigin({ lat, lng, address: results[0].formatted_address });
            setOriginText(results[0].formatted_address);
            mapRef.current?.setCenter({ lat, lng });
            mapRef.current?.setZoom(15);
          }
          setGpsLoading(false);
        });
      },
      () => { toast.error("Não foi possível obter sua localização"); setGpsLoading(false); },
      { enableHighAccuracy: true }
    );
  }, []);

  // Calculate route when both points are set
  useEffect(() => {
    if (!origin || !destination || !mapRef.current || !directionsRendererRef.current) return;
    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK" && result) {
          directionsRendererRef.current!.setDirections(result);
          const leg = result.routes[0].legs[0];
          const distKm = (leg.distance!.value / 1000).toFixed(1);
          const durMin = Math.ceil(leg.duration!.value / 60);
          setRouteInfo({
            distanceText: leg.distance!.text,
            distanceKm: distKm,
            durationText: leg.duration!.text,
            durationMinutes: durMin,
          });
        }
      }
    );
  }, [origin, destination]);

  const handleRequestRide = async () => {
    if (!origin || !destination || !routeInfo) { toast.error("Selecione origem e destino"); return; }
    setLoading(true);
    try {
      await requestRide.mutateAsync({
        passengerId: session.userId,
        originAddress: origin.address,
        originLat: origin.lat,
        originLng: origin.lng,
        destinationAddress: destination.address,
        destinationLat: destination.lat,
        destinationLng: destination.lng,
        distanceKm: routeInfo.distanceKm,
        durationMinutes: routeInfo.durationMinutes,
      });
      toast.success("Corrida solicitada! Aguarde um motorista aceitar.");
      activeRideQuery.refetch();
      setView("active");
    } catch (e: any) { toast.error(e.message || "Erro ao solicitar corrida"); }
    setLoading(false);
  };

  const handleCancelRide = async () => {
    if (!activeRide) return;
    setLoading(true);
    try {
      await cancelRide.mutateAsync({ rideId: activeRide.id, passengerId: session.userId });
      toast.success("Corrida cancelada");
      activeRideQuery.refetch();
      setView("request");
    } catch (e: any) { toast.error(e.message || "Erro ao cancelar"); }
    setLoading(false);
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    waiting: { label: "Aguardando motorista", color: "bg-yellow-100 text-yellow-800" },
    accepted: { label: "Motorista a caminho", color: "bg-blue-100 text-blue-800" },
    in_progress: { label: "Em andamento", color: "bg-green-100 text-green-800" },
    completed: { label: "Concluída", color: "bg-gray-100 text-gray-800" },
    cancelled_by_passenger: { label: "Cancelada por você", color: "bg-red-100 text-red-800" },
    cancelled_by_driver: { label: "Cancelada pelo motorista", color: "bg-red-100 text-red-800" },
  };

  const notifications = notificationsQuery.data || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-lg">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            {view !== "request" && (
              <Button variant="ghost" size="icon" onClick={() => setView("request")} className="text-primary-foreground hover:bg-white/20">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <h1 className="font-bold text-lg">ZapCorridas</h1>
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

      {/* Notifications banner */}
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

      {/* Greeting */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-sm text-muted-foreground">Olá, <span className="font-semibold text-foreground">{session.name}</span></p>
      </div>

      {/* Request Ride View */}
      {view === "request" && !activeRide && (
        <div className="px-4 pb-6 space-y-4">
          {/* Map */}
          <div className="rounded-xl overflow-hidden shadow-lg border">
            <MapView
              className="h-[250px] w-full"
              initialCenter={{ lat: -14.235, lng: -51.9253 }}
              initialZoom={4}
              onMapReady={handleMapReady}
            />
          </div>

          {/* Origin */}
          <Card className="shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm font-medium">Origem</span>
              </div>
              <div className="flex gap-2">
                <Input
                  ref={originInputRef}
                  placeholder="De onde você vai sair?"
                  value={originText}
                  onChange={(e) => setOriginText(e.target.value)}
                  className="h-12 rounded-xl text-sm"
                />
                <Button variant="outline" size="icon" onClick={handleGPS} disabled={gpsLoading} className="h-12 w-12 shrink-0 rounded-xl">
                  {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm font-medium">Destino</span>
              </div>
              <Input
                ref={destInputRef}
                placeholder="Para onde você vai?"
                value={destText}
                onChange={(e) => setDestText(e.target.value)}
                className="h-12 rounded-xl text-sm"
              />
            </CardContent>
          </Card>

          {/* Route Info */}
          {routeInfo && (
            <Card className="shadow-sm border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Route className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-semibold">{routeInfo.distanceText}</p>
                      <p className="text-sm text-muted-foreground">Distância estimada</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-primary" />
                    <div className="text-right">
                      <p className="font-semibold">{routeInfo.durationText}</p>
                      <p className="text-sm text-muted-foreground">Tempo estimado</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Request Button */}
          <Button
            onClick={handleRequestRide}
            disabled={!origin || !destination || !routeInfo || loading}
            className="w-full h-14 text-lg rounded-xl font-semibold shadow-lg"
          >
            {loading ? <Loader2 className="animate-spin mr-2" /> : <Car className="mr-2 w-5 h-5" />}
            Solicitar Corrida
          </Button>
        </div>
      )}

      {/* Active Ride View */}
      {(view === "active" || activeRide) && activeRide && (
        <div className="px-4 pb-6 space-y-4">
          <Card className="shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Corrida Ativa</CardTitle>
                <Badge className={statusLabels[activeRide.status]?.color || ""}>{statusLabels[activeRide.status]?.label}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
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

              <Separator />

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Distância</span>
                <span className="font-medium">{activeRide.distanceKm} km</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tempo estimado</span>
                <span className="font-medium">{activeRide.durationMinutes} min</span>
              </div>

              {/* Driver info */}
              {activeRide.driverInfo && (
                <>
                  <Separator />
                  <div className="bg-primary/5 rounded-xl p-4 space-y-2">
                    <p className="text-sm font-semibold text-primary">Seu Motorista</p>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{activeRide.driverInfo.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{activeRide.driverInfo.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{activeRide.driverInfo.carModel} - {activeRide.driverInfo.carColor} | {activeRide.driverInfo.plate}</span>
                    </div>
                  </div>
                </>
              )}

              {/* Cancel button */}
              {(activeRide.status === "waiting" || activeRide.status === "accepted") && (
                <Button variant="destructive" onClick={handleCancelRide} disabled={loading} className="w-full h-12 rounded-xl">
                  {loading ? <Loader2 className="animate-spin mr-2" /> : <X className="mr-2 w-4 h-4" />}
                  Cancelar Corrida
                </Button>
              )}

              {activeRide.status === "waiting" && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Procurando motorista...</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* History View */}
      {view === "history" && (
        <div className="px-4 pb-6 space-y-3">
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
                  {ride.driverInfo && <span>Motorista: {ride.driverInfo.name}</span>}
                  {ride.driverInfo && <span>Tel: {ride.driverInfo.phone}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
