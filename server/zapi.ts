/**
 * Z-API Integration Module
 * Handles all WhatsApp messaging through Z-API REST endpoints
 */

const ZAPI_INSTANCE_ID = process.env.ZAPI_INSTANCE_ID ?? "";
const ZAPI_TOKEN = process.env.ZAPI_TOKEN ?? "";
const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN ?? "";
const ZAPI_GROUP_ID = process.env.ZAPI_GROUP_ID ?? "";

const BASE_URL = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}`;

const headers = {
  "Content-Type": "application/json",
  "Client-Token": ZAPI_CLIENT_TOKEN,
};

/**
 * Send a text message via WhatsApp
 */
export async function sendTextMessage(phone: string, message: string): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/send-text`, {
      method: "POST",
      headers,
      body: JSON.stringify({ phone, message }),
    });
    const data = await response.json();
    console.log("[Z-API] sendText response:", JSON.stringify(data));
    return response.ok;
  } catch (error) {
    console.error("[Z-API] sendText error:", error);
    return false;
  }
}

/**
 * Send a location message via WhatsApp
 */
export async function sendLocation(
  phone: string,
  latitude: number,
  longitude: number
): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/send-location`, {
      method: "POST",
      headers,
      body: JSON.stringify({ phone, latitude, longitude }),
    });
    const data = await response.json();
    console.log("[Z-API] sendLocation response:", JSON.stringify(data));
    return response.ok;
  } catch (error) {
    console.error("[Z-API] sendLocation error:", error);
    return false;
  }
}

/**
 * Send a message to the drivers group
 */
export async function sendGroupMessage(message: string): Promise<boolean> {
  return sendTextMessage(ZAPI_GROUP_ID, message);
}

/**
 * Send verification code to a phone number
 */
export async function sendVerificationCode(phone: string, code: string): Promise<boolean> {
  const message = `🔐 *ZapCorridas*\n\nSeu código de verificação é: *${code}*\n\nEste código expira em 5 minutos.\nNão compartilhe com ninguém.`;
  return sendTextMessage(phone, message);
}

/**
 * Notify drivers group about a new ride request
 */
export async function notifyNewRide(params: {
  passengerName: string;
  passengerTotalRides: number;
  originAddress: string;
  destinationAddress: string;
  distanceKm: string;
  durationMinutes: number;
  acceptUrl: string;
}): Promise<boolean> {
  const message =
    `🚗 *NOVA CORRIDA DISPONÍVEL*\n\n` +
    `👤 Passageiro: *${params.passengerName}*\n` +
    `📊 Corridas realizadas: ${params.passengerTotalRides}\n\n` +
    `📍 Origem: ${params.originAddress}\n` +
    `🏁 Destino: ${params.destinationAddress}\n\n` +
    `📏 Distância: ${params.distanceKm} km\n` +
    `⏱️ Tempo estimado: ${params.durationMinutes} min\n\n` +
    `👉 Aceitar corrida: ${params.acceptUrl}`;
  return sendGroupMessage(message);
}

/**
 * Send ride details to driver (private message with passenger contact)
 */
export async function notifyDriverAccepted(params: {
  driverPhone: string;
  passengerName: string;
  passengerPhone: string;
  originAddress: string;
  destinationAddress: string;
  distanceKm: string;
  durationMinutes: number;
  originLat: number;
  originLng: number;
}): Promise<boolean> {
  const message =
    `✅ *CORRIDA ACEITA!*\n\n` +
    `👤 Passageiro: *${params.passengerName}*\n` +
    `📱 Contato: ${params.passengerPhone}\n\n` +
    `📍 Origem: ${params.originAddress}\n` +
    `🏁 Destino: ${params.destinationAddress}\n\n` +
    `📏 Distância: ${params.distanceKm} km\n` +
    `⏱️ Tempo estimado: ${params.durationMinutes} min\n\n` +
    `📍 Localização do passageiro:`;

  await sendTextMessage(params.driverPhone, message);
  await sendLocation(params.driverPhone, params.originLat, params.originLng);
  return true;
}

/**
 * Notify passenger that a driver accepted their ride
 */
export async function notifyPassengerAccepted(params: {
  passengerPhone: string;
  driverName: string;
  driverPhone: string;
  carModel: string;
  carColor: string;
  plate: string;
}): Promise<boolean> {
  const message =
    `🎉 *CORRIDA ACEITA!*\n\n` +
    `Seu motorista está a caminho!\n\n` +
    `👤 Motorista: *${params.driverName}*\n` +
    `📱 Contato: ${params.driverPhone}\n` +
    `🚗 Veículo: ${params.carModel} - ${params.carColor}\n` +
    `🔢 Placa: ${params.plate}`;
  return sendTextMessage(params.passengerPhone, message);
}

/**
 * Notify about ride cancellation
 */
export async function notifyCancellation(
  phone: string,
  cancelledBy: "passenger" | "driver",
  needsNewRequest: boolean
): Promise<boolean> {
  const who = cancelledBy === "passenger" ? "O passageiro" : "O motorista";
  let message = `❌ *CORRIDA CANCELADA*\n\n${who} cancelou a corrida.`;
  if (needsNewRequest) {
    message += `\n\nVocê precisará solicitar uma nova corrida.`;
  }
  return sendTextMessage(phone, message);
}

/**
 * Notify ride started
 */
export async function notifyRideStarted(passengerPhone: string): Promise<boolean> {
  const message = `🚗 *CORRIDA INICIADA*\n\nSua corrida começou! Tenha uma boa viagem.`;
  return sendTextMessage(passengerPhone, message);
}

/**
 * Notify ride completed
 */
export async function notifyRideCompleted(passengerPhone: string): Promise<boolean> {
  const message = `✅ *CORRIDA FINALIZADA*\n\nSua corrida foi concluída. Obrigado por usar o ZapCorridas!`;
  return sendTextMessage(passengerPhone, message);
}
