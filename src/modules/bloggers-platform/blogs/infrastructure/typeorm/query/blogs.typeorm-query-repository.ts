import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Blog } from '../../../domain/blog.entity';
import { BlogViewDto } from '../../../api/view-dto/blogs.view-dto';
import { GetBlogsQueryParams } from '../../../api/input-dto/get-blogs-query-params.input-dto';
import { PaginatedViewDto } from '../../../../../../core/dto/base.paginated.view-dto';
import { DomainException } from '../../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../../core/exceptions/domain-exception-codes';
import { isBigintId } from '../../../../../../core/database/bigint-id';
import {
  resolveSortDirection,
  resolveSortExpression,
} from './blogs-sort-columns';

@Injectable()
export class BlogsTypeOrmQueryRepository {
  constructor(
    @InjectRepository(Blog) private readonly repository: Repository<Blog>,
  ) {}

  async getAll(
    query: GetBlogsQueryParams,
  ): Promise<PaginatedViewDto<BlogViewDto[]>> {
    const builder = this.repository.createQueryBuilder('b');

    if (query.searchNameTerm !== null) {
      builder.where('b.name ILIKE :term', {
        term: `%${query.searchNameTerm}%`,
      });
    }

    //вторичная сортировка по id делает порядок детерминированным при равных значениях
    const direction = resolveSortDirection(query.sortDirection);
    const [blogs, totalCount] = await builder
      .orderBy(resolveSortExpression(query.sortBy), direction)
      .addOrderBy('b.id', direction)
      .offset(query.calculateSkip())
      .limit(query.pageSize)
      .getManyAndCount();

    return PaginatedViewDto.mapToView({
      items: blogs.map(BlogViewDto.mapToView),
      totalCount,
      page: query.pageNumber,
      size: query.pageSize,
    });
  }

  async getByIdOrNotFoundFail(id: string): Promise<BlogViewDto> {
    const blog = isBigintId(id)
      ? await this.repository.findOneBy({ id })
      : null;

    if (!blog) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Blog not found',
      });
    }

    return BlogViewDto.mapToView(blog);
  }
}
