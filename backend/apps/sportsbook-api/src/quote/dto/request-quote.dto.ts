/**
 * @module RequestQuoteDto
 * @description DTOs para la solicitud y respuesta de cotizaciones de apuestas.
 * Soporta tanto apuestas simples (single) como combinadas (parlay).
 */
import {
  IsOptional,
  IsUUID,
  IsNumber,
  IsString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para una pierna individual de un parlay.
 */
export class ParlayLegDto {
  /** ID de la selección elegida para esta pierna */
  @IsUUID()
  selectionId: string;
}

/**
 * DTO para solicitar una cotización de apuesta.
 *
 * Soporta dos modos de operación:
 * - **Single**: Se envía `selectionId` con una sola selección.
 * - **Parlay**: Se envía `selections` con 2-8 selecciones de distintos partidos.
 *
 * @example
 * ```typescript
 * // Apuesta simple
 * { selectionId: 'uuid', stake: 10, userId: 'user-1' }
 *
 * // Parlay
 * { selections: [{ selectionId: 'a' }, { selectionId: 'b' }], stake: 5, userId: 'user-1' }
 * ```
 */
export class RequestQuoteDto {
  /** ID de la selección para apuesta simple (retrocompatible) */
  @IsOptional()
  @IsUUID()
  selectionId?: string;

  /** Lista de selecciones para apuesta combinada (parlay, 2-8 legs) */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => ParlayLegDto)
  selections?: ParlayLegDto[];

  /** Monto de la apuesta en USD (mín: 0.01, máx: 1000) */
  @IsNumber()
  @Min(0.01)
  @Max(1000)
  stake: number;

  /** ID del usuario que solicita la cotización */
  @IsString()
  userId: string;

  /** ID de promoción a aplicar (apuesta gratis u odds boost) */
  @IsOptional()
  @IsUUID()
  promotionId?: string;
}

/**
 * Respuesta de una pierna individual dentro de un parlay.
 *
 * @interface QuoteLegResponse
 */
export interface QuoteLegResponse {
  /** ID de la selección */
  selectionId: string;
  /** Nombre del equipo local del partido */
  matchHomeTeam: string;
  /** Nombre del equipo visitante del partido */
  matchAwayTeam: string;
  /** Nombre de la selección (ej. "home", "away") */
  selectionName: string;
  /** Valor de las cuotas para esta selección */
  oddsValue: number;
}

/**
 * DTO de respuesta con los detalles completos de una cotización.
 *
 * @interface QuoteResponseDto
 */
export interface QuoteResponseDto {
  /** ID único de la cotización generada */
  quoteId: string;
  /** Tipo de apuesta: simple o combinada */
  type: 'SINGLE' | 'PARLAY';
  /** ID de la selección (solo para apuesta simple) */
  selectionId?: string;
  /** Monto apostado en USD */
  stake: number;
  /** Cuotas al momento de la cotización */
  oddsAtQuote: number;
  /** Pago esperado si la apuesta gana */
  expectedPayout: number;
  /** Fecha de expiración de la cotización (ISO 8601) */
  expiresAt: string;
  /** Segundos restantes hasta la expiración */
  ttlSeconds: number;
  /** Parámetros de la transacción blockchain para ejecutar la apuesta */
  txParams: {
    /** Dirección destino del contrato/tesorería */
    to: string;
    /** Valor de la transacción (en unidades mínimas) */
    value: string;
    /** Datos codificados de la transacción */
    data: string;
    /** ID de la cotización embebido en la transacción */
    quoteId: string;
  };
  /** Información del partido (solo para apuesta simple) */
  match?: {
    homeTeam: string;
    awayTeam: string;
    startTime: Date;
    league: string;
  };
  /** Información de la selección (solo para apuesta simple) */
  selection?: {
    name: string;
    oddsValue: number;
  };
  /** Piernas del parlay (solo para apuesta combinada) */
  legs?: QuoteLegResponse[];
  /** Indica si se aplicó una apuesta gratis */
  isFreeBet?: boolean;
  /** Monto cubierto por la apuesta gratis */
  freeBetAmount?: number;
}
