import { Module, Global } from '@nestjs/common';
import { OddsGateway } from './odds/odds.gateway';

@Global()
@Module({
  providers: [OddsGateway],
  exports: [OddsGateway],
})
export class WebsocketModule { }
