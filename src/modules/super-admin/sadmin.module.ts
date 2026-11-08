import { Module } from '@nestjs/common';
import { SadminController } from './sadmin.controller';

//контроллер только диспатчит команды/запросы: их обработчики живут в
//UserAccountsModule и BloggersPlatformModule, а CqrsModule подключён глобально
@Module({
  controllers: [SadminController],
})
export class SadminModule {}
