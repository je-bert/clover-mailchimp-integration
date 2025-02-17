import { Controller, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { AppService } from './app.service';

@Controller('webhooks')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('clover')
  async handleCloverWebhook(@Req() req: Request) {
    return this.appService.handleCloverWebhook(req);
  }
}
