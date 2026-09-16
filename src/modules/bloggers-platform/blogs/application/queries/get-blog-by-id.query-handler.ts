import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { BlogViewDto } from '../../api/view-dto/blogs.view-dto';
import { BlogsSqlQueryRepository } from '../../infrastructure/sql/query/blogs.sql-query-repository';

export class GetBlogByIdQuery {
  constructor(public id: string) {}
}

@QueryHandler(GetBlogByIdQuery)
export class GetBlogByIdQueryHandler implements IQueryHandler<
  GetBlogByIdQuery,
  BlogViewDto
> {
  constructor(private blogsSqlQueryRepository: BlogsSqlQueryRepository) {}

  async execute({ id }: GetBlogByIdQuery): Promise<BlogViewDto> {
    return this.blogsSqlQueryRepository.getByIdOrNotFoundFail(id);
  }
}
