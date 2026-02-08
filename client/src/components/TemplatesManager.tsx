import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Edit2, Save, X, AlertCircle } from "lucide-react";

export default function TemplatesManager() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState<string>("");
  const templatesQuery = trpc.admin.listTemplates.useQuery();
  const updateTemplate = trpc.admin.updateTemplate.useMutation({
    onSuccess: () => {
      templatesQuery.refetch();
      setEditingId(null);
      toast.success("Template atualizado com sucesso!");
    },
    onError: (error) => toast.error(error.message),
  });

  const handleEdit = (id: number, content: string) => {
    setEditingId(id);
    setEditingContent(content);
  };

  const handleSave = async (id: number) => {
    if (!editingContent.trim()) {
      toast.error("O conteúdo do template não pode estar vazio");
      return;
    }
    await updateTemplate.mutateAsync({ id, template: editingContent });
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    await updateTemplate.mutateAsync({ id, isActive: !isActive });
  };

  const variableExamples: Record<string, string> = {
    "{{code}}": "Código de verificação (ex: 123456)",
    "{{nome_passageiro}}": "Nome do passageiro",
    "{{telefone_passageiro}}": "Telefone do passageiro",
    "{{nome_motorista}}": "Nome do motorista",
    "{{telefone_motorista}}": "Telefone do motorista",
    "{{origem}}": "Endereço de origem",
    "{{destino}}": "Endereço de destino",
    "{{distancia}}": "Distância em km",
    "{{tempo}}": "Tempo estimado em minutos",
    "{{placa}}": "Placa do veículo",
    "{{cor_carro}}": "Cor do veículo",
    "{{modelo_carro}}": "Modelo do veículo",
    "{{total_corridas}}": "Total de corridas do motorista",
    "{{link_aceitar}}": "Link para aceitar a corrida",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="w-5 h-5 text-blue-500" />
        <p className="text-sm text-muted-foreground">
          Use as variáveis dinâmicas entre chaves duplas para personalizar as mensagens.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h3 className="font-semibold mb-3 text-sm">Variáveis Disponíveis</h3>
          <Card className="bg-muted/50">
            <CardContent className="p-3 space-y-2">
              {Object.entries(variableExamples).map(([variable, description]) => (
                <div key={variable} className="text-xs">
                  <code className="bg-background px-2 py-1 rounded text-primary font-mono">
                    {variable}
                  </code>
                  <p className="text-muted-foreground mt-1">{description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div>
          <h3 className="font-semibold mb-3 text-sm">Templates de Mensagens</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {templatesQuery.isLoading && (
              <div className="text-center py-8 text-muted-foreground">Carregando templates...</div>
            )}
            {templatesQuery.data?.map((template: any) => (
              <Card key={template.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-sm">{template.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                    </div>
                    <Switch
                      checked={template.isActive}
                      onCheckedChange={() => handleToggleActive(template.id, template.isActive)}
                      disabled={updateTemplate.isPending}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {editingId === template.id ? (
                    <>
                      <Textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="min-h-24 text-xs"
                        placeholder="Digite o conteúdo do template..."
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSave(template.id)}
                          disabled={updateTemplate.isPending}
                          className="flex-1"
                        >
                          <Save className="w-4 h-4 mr-1" />
                          Salvar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(null)}
                          disabled={updateTemplate.isPending}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-xs bg-muted p-2 rounded break-words whitespace-pre-wrap">
                        {template.template}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(template.id, template.template)}
                        disabled={updateTemplate.isPending}
                        className="w-full"
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
