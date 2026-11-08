import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '../../../domain/post.entity';
import { PostViewDto } from '../../../api/view-dto/posts.view-dto';
import { GetPostsQueryParams } from '../../../api/input-dto/get-posts-query-params.input-dto';
import { PaginatedViewDto } from '../../../../../../core/dto/base.paginated.view-dto';
import { DomainException } from '../../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../../core/exceptions/domain-exception-codes';
import { isBigintId } from '../../../../../../core/database/bigint-id';
import {
  resolveSortDirection,
  resolveSortExpression,
} from './posts-sort-columns';

/**
 * Лайки на этом этапе миграции не читаются: extendedLikesInfo заполняется
 * значениями-заглушками в PostViewDto.mapToView (0 / None / []).
 */
@Injectable()
export class PostsTypeOrmQueryRepository {
  constructor(
    @InjectRepository(Post) private readonly repository: Repository<Post>,
  ) {}

  //blogId задан — посты одного блога (GET /blogs/:blogId/posts), иначе все посты
  async getAll(
    query: GetPostsQueryParams,
    blogId?: string,
  ): Promise<PaginatedViewDto<PostViewDto[]>> {
    const builder = this.repository.createQueryBuilder('p');

    if (blogId !== undefined) {
      builder.where('p.blog_id = :blogId', { blogId });
    }

    const direction = resolveSortDirection(query.sortDirection);
    const [posts, totalCount] = await builder
      .orderBy(resolveSortExpression(query.sortBy), direction)
      .addOrderBy('p.id', direction)
      .offset(query.calculateSkip())
      .limit(query.pageSize)
      .getManyAndCount();

    return PaginatedViewDto.mapToView({
      items: posts.map(PostViewDto.mapToView),
      totalCount,
      page: query.pageNumber,
      size: query.pageSize,
    });
  }

  async getByIdOrNotFoundFail(id: string): Promise<PostViewDto> {
    const post = isBigintId(id)
      ? await this.repository.findOneBy({ id })
      : null;

    if (!post) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Post not found',
      });
    }

    return PostViewDto.mapToView(post);
  }
}
