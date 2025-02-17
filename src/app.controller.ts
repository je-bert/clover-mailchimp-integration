import { Controller, Post, Req, Res } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('webhooks')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('clover')
  async handleCloverWebhook(@Req() req: Request, @Res() res: Response) {
    return this.appService.handleCloverWebhook(req, res);
  }
}
