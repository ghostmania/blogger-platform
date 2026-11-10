import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UsersTypeOrmQueryRepository } from '../../infrastructure/typeorm/users.typeorm-query-repository';
import { UserViewDto } from '../../api/view-dto/users.view-dto';

export class GetUserByIdQuery {
  constructor(public id: string) {}
}

@QueryHandler(GetUserByIdQuery)
export class GetUserByIdQueryHandler implements IQueryHandler<
  GetUserByIdQuery,
  UserViewDto
> {
  constructor(private usersQueryRepository: UsersTypeOrmQueryRepository) {}

  async execute({ id }: GetUserByIdQuery): Promise<UserViewDto> {
    return this.usersQueryRepository.getByIdOrNotFoundFail(id);
  }
}
