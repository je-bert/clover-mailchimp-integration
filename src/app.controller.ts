import { Controller, Get, Post, Req, Res } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('webhooks')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('clover')
  async handleCloverWebhook(@Req() req: Request, @Res() res: Response) {
    return this.appService.handleCloverWebhook(req, res);
  }
  @Get('clover')
  async handleCloverAuth(@Req() req: Request, @Res() res) {
    return this.appService.handleCloverAuth(req, res);
  }
}
