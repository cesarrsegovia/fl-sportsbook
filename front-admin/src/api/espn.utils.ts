/**
 * @module EspnParser
 * @description Utilidades para parsear resultados crudos de ESPN y otras fuentes de datos deportivos.
 */

export interface ParsedResult {
  homeScore: string | number;
  awayScore: string | number;
  completed: boolean | string;
  homeWinner: boolean | string;
  awayWinner: boolean | string;
}

/**
 * Parsea el campo `resultRaw` (JSON o string) para extraer información clave de puntuación.
 * @param raw Datos crudos provenientes de ESPN o el backend.
 */
export function parseEspnResult(raw: any): ParsedResult | null {
  if (!raw) return null;
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    
    // Intenta extraer del formato estandarizado del backend o directamente de la estructura de ESPN
    const competitions = data.competitions?.[0];
    const competitors = competitions?.competitors;

    return {
      homeScore: data.homeScore ?? competitors?.find((c: any) => c.homeAway === 'home')?.score ?? 'N/A',
      awayScore: data.awayScore ?? competitors?.find((c: any) => c.homeAway === 'away')?.score ?? 'N/A',
      completed: data.completed ?? data.status?.type?.completed ?? 'N/A',
      homeWinner: data.homeWinner ?? 'N/A',
      awayWinner: data.awayWinner ?? 'N/A',
    };
  } catch (error) {
    console.error('Error parsing ESPN result:', error);
    return null;
  }
}
