import { pgPool } from '../../config/database';

export interface PushNotificationPayload {
  to: string;
  sound?: 'default' | null;
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
}

/**
 * Envía notificaciones push a través de Expo Push API
 * Doc: https://docs.expo.dev/push-notifications/sending-notifications/
 */
export async function sendExpoPushNotifications(messages: PushNotificationPayload[]): Promise<boolean> {
  if (!messages || messages.length === 0) return true;

  // Filtrar tokens válidos de Expo
  const validMessages = messages.filter(m => 
    typeof m.to === 'string' && (m.to.startsWith('ExponentPushToken[') || m.to.startsWith('ExpoPushToken['))
  );

  if (validMessages.length === 0) {
    console.log('ℹ️ [PushService] No hay tokens de Expo válidos en el lote:', messages.map(m => m.to));
    return false;
  }

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validMessages),
    });

    const data = await response.json();
    console.log(`📲 [PushService] ${validMessages.length} notificaciones enviadas a Expo. Respuesta:`, data);
    return true;
  } catch (error) {
    console.error('❌ [PushService] Error al conectar con el servidor Expo Push:', error);
    return false;
  }
}

/**
 * Envía notificación push a un usuario específico (cliente, repartidor o comercio)
 */
export async function sendPushToUser(
  usuarioId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  try {
    const res = await pgPool.query(
      'SELECT push_token FROM push_tokens WHERE usuario_id = $1',
      [usuarioId]
    );

    if (res.rows.length === 0) return;

    const messages: PushNotificationPayload[] = res.rows.map(row => ({
      to: row.push_token,
      sound: 'default',
      title,
      body,
      data: data || {},
      priority: 'high',
      channelId: 'default',
    }));

    await sendExpoPushNotifications(messages);
  } catch (error) {
    console.error(`❌ [PushService] Error enviando push al usuario ${usuarioId}:`, error);
  }
}

/**
 * Notifica a todos los repartidores activos/registrados
 */
export async function sendPushToDrivers(
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  try {
    const res = await pgPool.query(`
      SELECT DISTINCT pt.push_token 
      FROM push_tokens pt
      JOIN usuarios u ON pt.usuario_id = u.id
      WHERE u.rol = 'repartidor' AND u.is_activo = true
    `);

    if (res.rows.length === 0) {
      // Fallback: verificar si hay tokens asociados directamente al alias de conductor rep-baba-01
      const fallbackRes = await pgPool.query(`
        SELECT push_token FROM push_tokens WHERE usuario_id LIKE '%rep%'
      `);
      if (fallbackRes.rows.length === 0) return;
      res.rows.push(...fallbackRes.rows);
    }

    const messages: PushNotificationPayload[] = res.rows.map(row => ({
      to: row.push_token,
      sound: 'default',
      title,
      body,
      data: data || {},
      priority: 'high',
      channelId: 'default',
    }));

    await sendExpoPushNotifications(messages);
  } catch (error) {
    console.error('❌ [PushService] Error enviando push a repartidores:', error);
  }
}
