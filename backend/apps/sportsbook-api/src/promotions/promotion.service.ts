/**
 * @module PromotionService
 * @description Servicio de gestión de promociones consumido por el flujo de cotización.
 *
 * Proporciona:
 * - **Listado** de promociones activas disponibles para los usuarios.
 * - **Validación de elegibilidad** de una promoción para un usuario y selección específicos.
 * - **Soporte para Free Bets**: Apuestas gratis que cubren parte o todo el stake.
 * - **Soporte para Odds Boosts**: Mejora de cuotas en selecciones específicas.
 *
 * Validaciones de elegibilidad:
 * - La promoción debe estar activa y dentro de su ventana temporal.
 * - No debe haber alcanzado su límite de usos.
 * - El usuario no debe haber redimido la promoción previamente.
 * - Para ODDS_BOOST: la selección debe coincidir con la configurada.
 */
import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AppliedPromotion {
  promotionId: string;
  type: 'FREE_BET' | 'ODDS_BOOST';
  adjustedStake: number;
  isFreeBet: boolean;
  freeBetAmount: number;
  boostedOdds: number | null;
}

@Injectable()
export class PromotionService {
  private readonly logger = new Logger(PromotionService.name);

  constructor(private readonly prisma: PrismaService) {}

  private isEnabled(): boolean {
    return (process.env.PROMOTIONS_ENABLED ?? 'true') !== 'false';
  }

  async applyPromotion(params: {
    promotionId: string;
    userId: string;
    selectionId: string;
    stake: number;
  }): Promise<AppliedPromotion> {
    if (!this.isEnabled()) {
      throw new BadRequestException('Promotions engine is disabled');
    }

    const promo = await this.prisma.promotion.findUnique({
      where: { id: params.promotionId },
      include: {
        redemptions: { where: { userId: params.userId } },
      },
    });

    if (!promo) throw new NotFoundException('Promotion not found');
    if (promo.status !== 'ACTIVE') {
      throw new BadRequestException('Promotion is not active');
    }
    const now = new Date();
    if (now < promo.startsAt) {
      throw new BadRequestException('Promotion has not started yet');
    }
    if (now > promo.expiresAt) {
      throw new BadRequestException('Promotion has expired');
    }
    if (promo.redemptions.length > 0) {
      throw new BadRequestException('You have already used this promotion');
    }
    if (promo.maxUses != null && promo.usedCount >= promo.maxUses) {
      throw new BadRequestException('Promotion is fully redeemed');
    }

    if (promo.type === 'FREE_BET') {
      const freeBetAmount = Math.min(promo.freeBetAmount ?? 0, params.stake);
      return {
        promotionId: promo.id,
        type: 'FREE_BET',
        adjustedStake: params.stake - freeBetAmount,
        isFreeBet: true,
        freeBetAmount,
        boostedOdds: null,
      };
    }

    if (promo.type === 'ODDS_BOOST') {
      if (promo.selectionId !== params.selectionId) {
        throw new BadRequestException(
          'Odds boost not applicable to this selection',
        );
      }
      return {
        promotionId: promo.id,
        type: 'ODDS_BOOST',
        adjustedStake: params.stake,
        isFreeBet: false,
        freeBetAmount: 0,
        boostedOdds: promo.boostedOdds ?? null,
      };
    }

    throw new BadRequestException('Unknown promotion type');
  }

  async redeemPromotion(
    promotionId: string,
    userId: string,
    ticketId: string,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.promotionRedemption.create({
        data: { promotionId, userId, ticketId },
      }),
      this.prisma.promotion.update({
        where: { id: promotionId },
        data: { usedCount: { increment: 1 } },
      }),
    ]);
    this.logger.log(
      `Promotion ${promotionId} redeemed by ${userId} on ticket ${ticketId}`,
    );
  }
}
