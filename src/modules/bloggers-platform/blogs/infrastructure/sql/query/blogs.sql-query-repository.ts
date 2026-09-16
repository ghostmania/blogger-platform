import { Inject, Injectable } from '@nestjs/common';
import { PG_POOL } from '../../../../../../core/database/database.constants';
import { Pool } from 'pg';
import { BlogViewDto } from '../../../api/view-dto/blogs.view-dto';
import { DomainException } from '../../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../../core/exceptions/domain-exception-codes';
import { BlogRow, BlogSqlEntity } from '../../../domain/sql/blog.sql-entity';

const BLOG_COLUMNS = `id,
name,
description,
website_url,
created_at,
updated_at,
is_membership`;

@Injectable()
export class BlogsSqlQueryRepository {
  constructor(@Inject(PG_POOL) private pool: Pool) {}

  // async getAll(
  //   query: GetBlogsQueryParams,
  // ): Promise<PaginatedViewDto<BlogViewDto[]>> {
  //   const filter: FilterQuery<Blog> = {
  //     deletedAt: null,
  //   };
  //
  //   if (query.searchNameTerm) {
  //     filter.name = { $regex: query.searchNameTerm, $options: 'i' };
  //   }
  //
  //   const blogs = await this.BlogModel.find(filter)
  //     .sort({ [query.sortBy]: query.sortDirection })
  //     .skip(query.calculateSkip())
  //     .limit(query.pageSize);
  //
  //   const totalCount = await this.BlogModel.countDocuments(filter);
  //
  //   const items = blogs.map(BlogViewDto.mapToView);
  //
  //   return PaginatedViewDto.mapToView({
  //     items,
  //     totalCount,
  //     page: query.pageNumber,
  //     size: query.pageSize,
  //   });
  // }

  async getByIdOrNotFoundFail(id: string): Promise<BlogViewDto> {
    //id — bigint; нечисловая строка уронила бы запрос ошибкой 22P02
    if (!/^\d+$/.test(id)) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Blog not found',
      });
    }

    const { rows } = await this.pool.query<BlogRow>(
      `SELECT ${BLOG_COLUMNS}
       FROM blogs
       WHERE id = $1
      `,
      [id],
    );

    if (!rows.length) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Blog not found',
      });
    }

    return BlogViewDto.mapToView(BlogSqlEntity.fromRow(rows[0]));
  }
}
