import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { MessageCircle, Phone, User, Loader2, ArrowLeft } from "lucide-react";

type Step = "phone" | "name" | "code";

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkPhone = trpc.whatsappAuth.checkPhone.useMutation();
  const sendCode = trpc.whatsappAuth.sendCode.useMutation();
  const verifyCode = trpc.whatsappAuth.verifyCode.useMutation();

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const rawPhone = (formatted: string) => {
    const digits = formatted.replace(/\D/g, "");
    return "55" + digits;
  };

  const handleCheckPhone = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) { toast.error("Digite um número válido"); return; }
    setLoading(true);
    try {
      const result = await checkPhone.mutateAsync({ phone: rawPhone(phone) });
      if (result.status === "blocked") { toast.error("Sua conta está bloqueada. Entre em contato com o administrador."); setLoading(false); return; }
      if (result.status === "expired") { toast.error("Sua conta de motorista expirou. Entre em contato com o administrador."); setLoading(false); return; }
      if (result.status === "new") {
        setIsNew(true);
        setStep("name");
      } else {
        await sendCode.mutateAsync({ phone: rawPhone(phone) });
        toast.success("Código enviado via WhatsApp!");
        setStep("code");
      }
    } catch (e: any) { toast.error(e.message || "Erro ao verificar telefone"); }
    setLoading(false);
  };

  const handleSendCodeAfterName = async () => {
    if (!name.trim() || name.trim().length < 3) { toast.error("Digite seu nome completo"); return; }
    setLoading(true);
    try {
      await sendCode.mutateAsync({ phone: rawPhone(phone) });
      toast.success("Código enviado via WhatsApp!");
      setStep("code");
    } catch (e: any) { toast.error(e.message || "Erro ao enviar código"); }
    setLoading(false);
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) { toast.error("Digite o código completo"); return; }
    setLoading(true);
    try {
      await verifyCode.mutateAsync({ phone: rawPhone(phone), code, name: isNew ? name : undefined });
      toast.success("Login realizado com sucesso!");
      onLogin();
    } catch (e: any) { toast.error(e.message || "Código inválido"); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-4">
            <MessageCircle className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">ZapCorridas</h1>
          <p className="text-muted-foreground mt-2">Sua corrida a um toque de distância</p>
        </div>

        <Card className="shadow-xl border-0 shadow-primary/5">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">
              {step === "phone" && "Entrar com WhatsApp"}
              {step === "name" && "Completar Cadastro"}
              {step === "code" && "Verificação"}
            </CardTitle>
            <CardDescription>
              {step === "phone" && "Digite seu número de telefone para continuar"}
              {step === "name" && "Precisamos do seu nome para criar sua conta"}
              {step === "code" && "Digite o código de 6 dígitos enviado no WhatsApp"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === "phone" && (
              <>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="(99) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    className="pl-11 h-14 text-lg rounded-xl"
                    maxLength={15}
                    inputMode="numeric"
                    onKeyDown={(e) => e.key === "Enter" && handleCheckPhone()}
                  />
                </div>
                <Button onClick={handleCheckPhone} disabled={loading} className="w-full h-14 text-lg rounded-xl font-semibold">
                  {loading ? <Loader2 className="animate-spin mr-2" /> : <MessageCircle className="mr-2 w-5 h-5" />}
                  Continuar com WhatsApp
                </Button>
              </>
            )}

            {step === "name" && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setStep("phone")} className="mb-2 -ml-2">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
                </Button>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Seu nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-11 h-14 text-lg rounded-xl"
                    onKeyDown={(e) => e.key === "Enter" && handleSendCodeAfterName()}
                  />
                </div>
                <Button onClick={handleSendCodeAfterName} disabled={loading} className="w-full h-14 text-lg rounded-xl font-semibold">
                  {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                  Enviar Código
                </Button>
              </>
            )}

            {step === "code" && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setStep("phone")} className="mb-2 -ml-2">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
                </Button>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={code} onChange={setCode}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="w-12 h-14 text-xl" />
                      <InputOTPSlot index={1} className="w-12 h-14 text-xl" />
                      <InputOTPSlot index={2} className="w-12 h-14 text-xl" />
                      <InputOTPSlot index={3} className="w-12 h-14 text-xl" />
                      <InputOTPSlot index={4} className="w-12 h-14 text-xl" />
                      <InputOTPSlot index={5} className="w-12 h-14 text-xl" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button onClick={handleVerifyCode} disabled={loading || code.length !== 6} className="w-full h-14 text-lg rounded-xl font-semibold">
                  {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                  Verificar Código
                </Button>
                <Button variant="ghost" onClick={() => sendCode.mutateAsync({ phone: rawPhone(phone) }).then(() => toast.success("Código reenviado!"))} className="w-full text-sm text-muted-foreground">
                  Reenviar código
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Ao continuar, você concorda com nossos termos de uso.
        </p>
      </div>
    </div>
  );
}
