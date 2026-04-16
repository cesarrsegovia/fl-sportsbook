import { Module } from '@nestjs/common';
import { EventCatalogService } from './event-catalog.service';

@Module({
  providers: [EventCatalogService],
  exports: [EventCatalogService],
})
export class EventCatalogModule {}
