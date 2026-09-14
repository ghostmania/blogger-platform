import { Module } from '@nestjs/common';
import { SadminController } from './sadmin.controller';
// import { TestingController } from './testing.controller';

@Module({
  imports: [],
  controllers: [SadminController],
})
export class SadminModule {}
