import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as webpush from 'web-push';
import { nfc } from '@babotalk/shared';
import type { PushSubscription, VapidKeyResult } from '@babotalk/shared';
import { User, UserDocument } from '../../database/schemas/user.schema';

// #1 웹푸시(VAPID).
// VAPID 키가 설정되지 않으면 기능을 비활성화(에러를 던지지 않고 no-op + 경고 로그).
// 다른 모듈(messages/chat 등)이 sendToNickname()을 호출해 오프라인 유저에게 발송한다.
@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private enabled = false;
  private publicKey = '';

  constructor(
    private readonly config: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  onModuleInit(): void {
    const publicKey = this.config.get<string>('vapid.publicKey') ?? '';
    const privateKey = this.config.get<string>('vapid.privateKey') ?? '';
    const subject =
      this.config.get<string>('vapid.subject') ?? 'mailto:admin@babo7.top';

    if (!publicKey || !privateKey) {
      this.enabled = false;
      this.logger.warn(
        'VAPID 키가 설정되지 않아 웹푸시가 비활성화됩니다(no-op). VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY를 설정하세요.',
      );
      return;
    }

    try {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.publicKey = publicKey;
      this.enabled = true;
      this.logger.log('웹푸시(VAPID) 활성화됨');
    } catch (err) {
      this.enabled = false;
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`VAPID 초기화 실패로 웹푸시 비활성화: ${message}`);
    }
  }

  /** GET /api/push/vapid-key — 공개키 반환(비활성 시 빈 문자열). */
  getVapidKey(): VapidKeyResult {
    return { publicKey: this.publicKey };
  }

  /**
   * POST /api/push/subscribe — 현재 유저의 pushSubscriptions에 endpoint 중복 없이 저장.
   */
  async subscribe(
    username: string,
    subscription: PushSubscription,
  ): Promise<void> {
    if (!subscription || !subscription.endpoint) return;
    const user = await this.userModel.findOne({ username: nfc(username) }).exec();
    if (!user) return;

    const subs: PushSubscription[] = user.pushSubscriptions ?? [];
    if (subs.some((s) => s.endpoint === subscription.endpoint)) return; // 중복 방지

    subs.push(subscription);
    user.pushSubscriptions = subs;
    await user.save();
  }

  /**
   * 닉네임으로 유저를 찾아 모든 구독에 푸시 발송.
   * 410(Gone)/404(Not Found) 응답이면 만료된 구독으로 보고 해당 구독을 제거한다.
   * 비활성(키 없음) 시 조용히 no-op.
   *
   * 다른 모듈이 호출하는 공개 시그니처(변경 금지):
   *   sendToNickname(nickname, { title, body, url? }): Promise<void>
   */
  async sendToNickname(
    nickname: string,
    payload: { title: string; body: string; url?: string },
  ): Promise<void> {
    if (!this.enabled) return; // no-op

    const nick = nfc(nickname);
    const user = await this.userModel.findOne({ nickname: nick }).exec();
    if (!user) return;

    const subs: PushSubscription[] = user.pushSubscriptions ?? [];
    if (subs.length === 0) return;

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url,
    });

    const stale: string[] = [];

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            sub as unknown as webpush.PushSubscription,
            body,
          );
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            stale.push(sub.endpoint); // 만료/삭제된 구독
          } else {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.warn(`푸시 발송 실패(${nick}): ${message}`);
          }
        }
      }),
    );

    if (stale.length > 0) {
      user.pushSubscriptions = subs.filter(
        (s) => !stale.includes(s.endpoint),
      );
      await user.save();
    }
  }
}
