import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { BlogsQueryRepository } from '../../infrastructure/query/blogs.query-repository';
import { GetBlogsQueryParams } from '../../api/input-dto/get-blogs-query-params.input-dto';
import { BlogViewDto } from '../../api/view-dto/blogs.view-dto';
import { PaginatedViewDto } from '../../../../../core/dto/base.paginated.view-dto';

export class GetBlogsQuery {
  constructor(public queryParams: GetBlogsQueryParams) {}
}

@QueryHandler(GetBlogsQuery)
export class GetBlogsQueryHandler implements IQueryHandler<
  GetBlogsQuery,
  PaginatedViewDto<BlogViewDto[]>
> {
  constructor(private blogsQueryRepository: BlogsQueryRepository) {}

  async execute({
    queryParams,
  }: GetBlogsQuery): Promise<PaginatedViewDto<BlogViewDto[]>> {
    return this.blogsQueryRepository.getAll(queryParams);
  }
}
