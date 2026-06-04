import { Module } from '@nestjs/common';
import { WebrtcGateway } from './webrtc.gateway';
import { WebrtcController } from './webrtc.controller';

// WebRTC 시그널링 모듈. JWT(JwtService)는 @Global SecurityModule이 제공한다.
// 로드맵: SFU 단계에서 MediaService 구현체(SfuMediaService)를 여기 providers에 등록하고
// WebrtcGateway에 주입한다.
@Module({
  controllers: [WebrtcController],
  providers: [WebrtcGateway],
})
export class WebrtcModule {}
