import { UserEntity } from '../../../domain/entity.contracts';

export class UserExternalDto {
  id: string;
  login: string;
  email: string;
  createdAt: Date;
  firstName: string;
  lastName: string | null;

  static mapToView(user: UserEntity): UserExternalDto {
    const dto = new UserExternalDto();

    dto.email = user.email;
    dto.login = user.login;
    dto.id = user.id;
    dto.createdAt = user.createdAt;
    dto.firstName = user.name.firstName;
    dto.lastName = user.name.lastName;

    return dto;
  }
}
