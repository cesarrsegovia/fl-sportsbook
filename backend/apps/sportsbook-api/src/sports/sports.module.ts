import { Module } from '@nestjs/common';
import { SportsService } from './sports.service';
import { SportsController } from './sports.controller';
import { EventCatalogModule } from '../catalog/event-catalog.module';

@Module({
  imports: [EventCatalogModule],
  providers: [SportsService],
  exports: [SportsService],
  controllers: [SportsController],
})
export class SportsModule {}
