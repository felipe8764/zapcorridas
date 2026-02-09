/**
 * Z-API Integration Module
 * Handles all WhatsApp messaging through Z-API REST endpoints
 * Uses message templates from database for customizable messages
 */

import * as db from "./db";

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
 * Replace variables in a template string
 * Variables are in format {{variable_name}}
 */
function replaceVariables(template: string, variables: Record<string, string | number>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, "g");
    result = result.replace(regex, String(value));
  }
  return result;
}

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
  try {
    const template = await db.getMessageTemplate("verification_code");
    let message = template?.template || `🔐 *ZapCorridas*\n\nSeu código de verificação é: *{{code}}*\n\nEste código expira em 5 minutos.\nNão compartilhe com ninguém.`;
    
    if (!template?.isActive) {
      console.warn("[Z-API] Verification code template is disabled");
      return false;
    }

    message = replaceVariables(message, { code });
    return sendTextMessage(phone, message);
  } catch (error) {
    console.error("[Z-API] sendVerificationCode error:", error);
    return false;
  }
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
  try {
    const template = await db.getMessageTemplate("new_ride_group");
    let message = template?.template || 
      `🚗 *NOVA CORRIDA DISPONÍVEL*\n\n` +
      `👤 Passageiro: *{{nome_passageiro}}*\n` +
      `📊 Corridas realizadas: {{total_corridas}}\n\n` +
      `📍 Origem: {{origem}}\n` +
      `🏁 Destino: {{destino}}\n\n` +
      `📏 Distância: {{distancia}} km\n` +
      `⏱️ Tempo estimado: {{tempo}} min\n\n` +
      `👉 Aceitar corrida: {{link_aceitar}}`;

    if (!template?.isActive) {
      console.warn("[Z-API] New ride template is disabled");
      return false;
    }

    message = replaceVariables(message, {
      nome_passageiro: params.passengerName,
      total_corridas: params.passengerTotalRides,
      origem: params.originAddress,
      destino: params.destinationAddress,
      distancia: params.distanceKm,
      tempo: params.durationMinutes,
      link_aceitar: params.acceptUrl,
    });

    return sendGroupMessage(message);
  } catch (error) {
    console.error("[Z-API] notifyNewRide error:", error);
    return false;
  }
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
  try {
    const template = await db.getMessageTemplate("driver_accepted_private");
    let message = template?.template ||
      `✅ *CORRIDA ACEITA!*\n\n` +
      `👤 Passageiro: *{{nome_passageiro}}*\n` +
      `📱 Contato: {{telefone_passageiro}}\n\n` +
      `📍 Origem: {{origem}}\n` +
      `🏁 Destino: {{destino}}\n\n` +
      `📏 Distância: {{distancia}} km\n` +
      `⏱️ Tempo estimado: {{tempo}} min\n\n` +
      `📍 Localização do passageiro:`;

    if (!template?.isActive) {
      console.warn("[Z-API] Driver accepted template is disabled");
      return false;
    }

    message = replaceVariables(message, {
      nome_passageiro: params.passengerName,
      telefone_passageiro: params.passengerPhone,
      origem: params.originAddress,
      destino: params.destinationAddress,
      distancia: params.distanceKm,
      tempo: params.durationMinutes,
    });

    await sendTextMessage(params.driverPhone, message);
    await sendLocation(params.driverPhone, params.originLat, params.originLng);
    return true;
  } catch (error) {
    console.error("[Z-API] notifyDriverAccepted error:", error);
    return false;
  }
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
  try {
    const template = await db.getMessageTemplate("passenger_accepted");
    let message = template?.template ||
      `🎉 *CORRIDA ACEITA!*\n\n` +
      `Seu motorista está a caminho!\n\n` +
      `👤 Motorista: *{{nome_motorista}}*\n` +
      `📱 Contato: {{telefone_motorista}}\n` +
      `🚗 Veículo: {{modelo_carro}} - {{cor_carro}}\n` +
      `🔢 Placa: {{placa}}`;

    if (!template?.isActive) {
      console.warn("[Z-API] Passenger accepted template is disabled");
      return false;
    }

    message = replaceVariables(message, {
      nome_motorista: params.driverName,
      telefone_motorista: params.driverPhone,
      modelo_carro: params.carModel,
      cor_carro: params.carColor,
      placa: params.plate,
    });

    return sendTextMessage(params.passengerPhone, message);
  } catch (error) {
    console.error("[Z-API] notifyPassengerAccepted error:", error);
    return false;
  }
}

/**
 * Notify about ride cancellation
 */
export async function notifyCancellation(
  phone: string,
  cancelledBy: "passenger" | "driver",
  isPassenger: boolean
): Promise<boolean> {
  try {
    const templateKey = cancelledBy === "passenger" ? "passenger_cancelled" : "driver_cancelled";
    const template = await db.getMessageTemplate(templateKey);
    
    let message = "";
    if (cancelledBy === "passenger") {
      message = template?.template || `❌ *Corrida Cancelada*\n\nO passageiro cancelou a corrida.`;
    } else {
      message = template?.template || `❌ *Corrida Cancelada*\n\nO motorista cancelou a corrida. Procurando outro motorista...`;
    }

    if (!template?.isActive) {
      console.warn(`[Z-API] Cancellation template (${templateKey}) is disabled`);
      return false;
    }

    return sendTextMessage(phone, message);
  } catch (error) {
    console.error("[Z-API] notifyCancellation error:", error);
    return false;
  }
}

/**
 * Notify passenger that ride has started
 */
export async function notifyRideStarted(passengerPhone: string): Promise<boolean> {
  try {
    const template = await db.getMessageTemplate("ride_started");
    let message = template?.template || `🚗 *Corrida Iniciada!*\n\nSeu motorista está a caminho do destino.`;

    if (!template?.isActive) {
      console.warn("[Z-API] Ride started template is disabled");
      return false;
    }

    return sendTextMessage(passengerPhone, message);
  } catch (error) {
    console.error("[Z-API] notifyRideStarted error:", error);
    return false;
  }
}

/**
 * Notify passenger that ride has completed
 */
export async function notifyRideCompleted(passengerPhone: string): Promise<boolean> {
  try {
    const template = await db.getMessageTemplate("ride_completed");
    let message = template?.template || `✅ *Corrida Finalizada!*\n\nObrigado por usar ZapCorridas! 🚗`;

    if (!template?.isActive) {
      console.warn("[Z-API] Ride completed template is disabled");
      return false;
    }

    return sendTextMessage(passengerPhone, message);
  } catch (error) {
    console.error("[Z-API] notifyRideCompleted error:", error);
    return false;
  }
}
