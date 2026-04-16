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

export class ParlayLegDto {
  @IsUUID()
  selectionId: string;
}

export class RequestQuoteDto {
  // SINGLE (retrocompatible)
  @IsOptional()
  @IsUUID()
  selectionId?: string;

  // PARLAY
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => ParlayLegDto)
  selections?: ParlayLegDto[];

  @IsNumber()
  @Min(0.01)
  @Max(1000)
  stake: number;

  @IsString()
  userId: string;

  @IsOptional()
  @IsUUID()
  promotionId?: string;
}

export interface QuoteLegResponse {
  selectionId: string;
  matchHomeTeam: string;
  matchAwayTeam: string;
  selectionName: string;
  oddsValue: number;
}

export interface QuoteResponseDto {
  quoteId: string;
  type: 'SINGLE' | 'PARLAY';
  selectionId?: string;
  stake: number;
  oddsAtQuote: number;
  expectedPayout: number;
  expiresAt: string;
  ttlSeconds: number;
  txParams: {
    to: string;
    value: string;
    data: string;
    quoteId: string;
  };
  match?: {
    homeTeam: string;
    awayTeam: string;
    startTime: Date;
    league: string;
  };
  selection?: {
    name: string;
    oddsValue: number;
  };
  legs?: QuoteLegResponse[];
  isFreeBet?: boolean;
  freeBetAmount?: number;
}
