import { Global, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

//глобальный модуль для провайдеров и модулей, необходимых во всех частях приложения.
//CqrsModule регистрируем здесь и реэкспортируем, чтобы CommandBus/QueryBus были
//доступны в любом фиче-модуле без повторного импорта
@Global()
@Module({
  imports: [CqrsModule],
  exports: [CqrsModule],
})
export class CoreModule {}
