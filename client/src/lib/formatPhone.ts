/**
 * Formata um número de telefone brasileiro para o padrão (XX) XXXXX-XXXX
 * Remove o código do país (55) se presente
 * @param phone - Número de telefone em qualquer formato
 * @returns Número formatado como (XX) XXXXX-XXXX
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  
  // Remove todos os caracteres não numéricos
  const cleaned = phone.replace(/\D/g, "");
  
  // Remove código do país (55) se estiver no início
  const withoutCountry = cleaned.length > 11 ? cleaned.slice(-11) : cleaned;
  
  // Formata como (XX) XXXXX-XXXX
  if (withoutCountry.length === 11) {
    return `(${withoutCountry.slice(0, 2)}) ${withoutCountry.slice(2, 7)}-${withoutCountry.slice(7)}`;
  }
  
  // Se não tiver 11 dígitos, retorna o número limpo
  return withoutCountry;
}
