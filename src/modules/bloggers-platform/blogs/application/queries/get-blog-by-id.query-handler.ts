import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { BlogViewDto } from '../../api/view-dto/blogs.view-dto';
import { BlogsTypeOrmQueryRepository } from '../../infrastructure/typeorm/query/blogs.typeorm-query-repository';

export class GetBlogByIdQuery {
  constructor(public id: string) {}
}

@QueryHandler(GetBlogByIdQuery)
export class GetBlogByIdQueryHandler implements IQueryHandler<
  GetBlogByIdQuery,
  BlogViewDto
> {
  constructor(private blogsQueryRepository: BlogsTypeOrmQueryRepository) {}

  async execute({ id }: GetBlogByIdQuery): Promise<BlogViewDto> {
    return this.blogsQueryRepository.getByIdOrNotFoundFail(id);
  }
}
