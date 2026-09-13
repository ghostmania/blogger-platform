import { OmitType } from '@nestjs/swagger';
import { UserEntity } from '../../domain/entity.contracts';

export class UserViewDto {
  id: string;
  login: string;
  email: string;
  createdAt: Date;

  //принимает контракт сущности, а не UserDocument: одна и та же view-модель
  //собирается и из монго-документа, и из SQL-сущности
  static mapToView(user: UserEntity): UserViewDto {
    const dto = new UserViewDto();

    dto.email = user.email;
    dto.login = user.login;
    dto.id = user.id;
    dto.createdAt = user.createdAt;

    return dto;
  }
}

//https://docs.nestjs.com/openapi/mapped-types
export class MeViewDto extends OmitType(UserViewDto, [
  'createdAt',
  'id',
] as const) {
  userId: string;

  static mapToView(user: UserEntity): MeViewDto {
    const dto = new MeViewDto();

    dto.email = user.email;
    dto.login = user.login;
    dto.userId = user.id;

    return dto;
  }
}
