import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { HealthController } from './controllers/health.controller';
import { RecordsController } from './controllers/records.controller';
import { ShareController } from './controllers/share.controller';

@Module({
  imports: [],
  controllers: [
    HealthController,
    AuthController,
    RecordsController,
    ShareController,
  ],
  providers: [],
})
export class AppModule {}
