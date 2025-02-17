import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class AppService {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async handleCloverWebhook(req: Request) {
    const cloverAuth = req.headers['x-clover-auth']; // Get the auth header
    if (
      !cloverAuth ||
      cloverAuth !== this.configService.get<string>('CLOVER_AUTH_SECRET')
    ) {
      console.log(req.body);
      console.warn('Unauthorized Clover Webhook received');
      // allow for clover initial webhook verification
      return { message: 'Unauthorized' };
    }

    const event = req.body;

    console.log('Received Clover Event:', JSON.stringify(event, null, 2));

    const { merchants } = event;
    if (!merchants) {
      throw new BadRequestException('Missing merchants in event');
    }

    const merchantId = Object.keys(merchants)?.[0];
    if (!merchantId) {
      throw new BadRequestException('Merchant ID missing');
    }
    const type = merchants[merchantId][0]?.type;

    if (type === 'DELETE') {
      console.log('Ignoring DELETE event');
      return { success: true };
    }

    const customerData = merchants[merchantId][0]?.object;
    if (!customerData) {
      throw new BadRequestException('Missing customer data');
    }

    const emails = customerData?.emailAddresses?.map((e) => e.emailAddress);
    const phoneNumbers = customerData?.phoneNumbers?.map((p) => p.phoneNumber);

    if (emails.length > 0) {
      const email = emails[0];
      const firstName = customerData?.firstName;
      const lastName = customerData?.lastName;
      // const metadata = customerData?.metadata;

      // const fieldValues = Object.entries(metadata).map(([key, value]) => ({
      //   field: key,
      //   value: value.toString(),
      // }));

      const payload = {
        contact: {
          email,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          phone: phoneNumbers?.[0] || undefined,
          // fieldValues: fieldValues.length > 0 ? fieldValues : undefined,
        },
      };

      // https://developers.activecampaign.com/reference/sync-a-contacts-data
      const { data } = await firstValueFrom(
        this.httpService
          .post(
            `${this.configService.get<string>('ACTIVE_CAMPAIGN_API_URL')}/api/3/contact/sync`,
            payload,
            {
              headers: {
                'Api-Token': this.configService.get<string>(
                  'ACTIVE_CAMPAIGN_API_KEY',
                ),
              },
            },
          )
          .pipe(
            catchError((err) => {
              console.error('Failed to sync contact:', err);
              throw new BadRequestException('Failed to sync contact');
            }),
          ),
      );
      console.log('Successfully synced contact');
      console.log(data);
    }

    return { success: true };
  }
}
