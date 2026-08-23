import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AuthQueryRepository } from '../../infrastructure/query/auth.query-repository';
import { MeViewDto } from '../../api/view-dto/users.view-dto';

export class GetMeQuery {
  constructor(public userId: string) {}
}

@QueryHandler(GetMeQuery)
export class GetMeQueryHandler implements IQueryHandler<GetMeQuery, MeViewDto> {
  constructor(private authQueryRepository: AuthQueryRepository) {}

  async execute({ userId }: GetMeQuery): Promise<MeViewDto> {
    return this.authQueryRepository.me(userId);
  }
}
