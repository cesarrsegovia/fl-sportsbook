// Canonical spec location — logic lives in sportsbook-api/src/catalog/event-catalog.service.ts
// This file re-exports from the shared PrismaService and mirrors the same interface.
// In a future extraction to a shared lib, this will be the primary implementation.
export { EventCatalogService } from '../../sportsbook-api/src/catalog/event-catalog.service';
