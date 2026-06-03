import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

// 가드(JwtAuthGuard)는 @Global SecurityModule이, ConfigService는 @Global ConfigModule이 제공.
// FilesService를 export해 messages 등 다른 모듈이 토큰 URL 생성/검증을 재사용할 수 있게 한다.
@Module({
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
