import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WebhooksController } from './webhooks/webhooks.controller';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Allows .env access throughout the app
    }),
    HttpModule,
  ],
  controllers: [AppController, WebhooksController],
  providers: [AppService],
})
export class AppModule {}
