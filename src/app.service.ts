import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { count } from 'console';
import { catchError, firstValueFrom } from 'rxjs';

@Injectable()
export class AppService {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async handleCloverAuth(req: any, res: any) {
    const cloverAuth = req.headers['x-clover-auth']; // Get the auth header
    if (
      !cloverAuth ||
      cloverAuth !== this.configService.get<string>('CLOVER_AUTH_SECRET')
    ) {
      console.warn('Unauthorized Clover Auth request');
      return res.status(401).send('Unauthorized');
    }
    return res.status(200).send('Authorized');
  }

  async handleCloverWebhook(req: any, res: any) {
    const cloverAuth = req.headers['x-clover-auth']; // Get the auth header
    if (
      !cloverAuth ||
      cloverAuth !== this.configService.get<string>('CLOVER_AUTH_SECRET')
    ) {
      console.log(req.body);
      console.warn('Unauthorized Clover Webhook received');
      // allow for clover initial webhook verification
      // Allow for Clover initial webhook verification
      return res.status(200).json({ success: true });
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
    const addresses = customerData?.addresses.map((a) => ({
      addr1: a?.address1 || '',
      city: a?.city || '',
      state: a?.state || '',
      zip: a?.zip || '',
      country: a?.country || undefined,
      addr2: a?.address2 || undefined,
    }));

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
        members: [
          {
            email_address: email,
            status: 'subscribed',
            merge_fields: {
              FNAME: firstName || '',
              LNAME: lastName || '',
              PHONE: phoneNumbers.length > 0 ? phoneNumbers[0] : '',
              ADDRESS: addresses.length > 0 ? addresses[0] : '',
            },
            tags: ['Clover'],
          },
        ],
        update_existing: true, // Ensures existing contacts are updated
      };

      const url = `https://${this.configService.get<string>('MAIL_CHIMP_DC')}.api.mailchimp.com/3.0/lists/${this.configService.get<string>('MAIL_CHIMP_AUDIENCE_ID')}`;

      // https://developers.activecampaign.com/reference/sync-a-contacts-data
      const { data } = await firstValueFrom(
        this.httpService
          .post(url, payload, {
            headers: {
              Authorization: `Bearer ${this.configService.get<string>(
                'MAIL_CHIMP_API_KEY',
              )}`,
              'Content-Type': 'application/json',
            },
          })
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

    return res.status(200).json({ success: true });
  }
}
