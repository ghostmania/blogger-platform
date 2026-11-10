import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Post } from '../../../domain/post.entity';
import {
  NewestLikeViewDto,
  PostViewDto,
} from '../../../api/view-dto/posts.view-dto';
import { GetPostsQueryParams } from '../../../api/input-dto/get-posts-query-params.input-dto';
import { PaginatedViewDto } from '../../../../../../core/dto/base.paginated.view-dto';
import { DomainException } from '../../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../../core/exceptions/domain-exception-codes';
import { isBigintId } from '../../../../../../core/database/bigint-id';
import { LikeStatus } from '../../../../enums/like-status.enum';
import { PostLike } from '../../../../likes/domain/post-like.entity';
import { User } from '../../../../../user-accounts/domain/user.entity';
import {
  resolveSortDirection,
  resolveSortExpression,
} from './posts-sort-columns';

//сырые колонки реакций, которые добавляются к выборке постов
type LikesRow = {
  likes_count: string;
  dislikes_count: string;
  my_status: LikeStatus | null;
};

type NewestLikeRow = {
  post_id: string;
  user_id: string;
  login: string;
  added_at: Date;
};

const NEWEST_LIKES_LIMIT = 3;

@Injectable()
export class PostsTypeOrmQueryRepository {
  constructor(
    @InjectRepository(Post) private readonly repository: Repository<Post>,
  ) {}

  //blogId задан — посты одного блога (GET /blogs/:blogId/posts), иначе все посты
  async getAll(
    query: GetPostsQueryParams,
    blogId?: string,
    userId: string | null = null,
  ): Promise<PaginatedViewDto<PostViewDto[]>> {
    const builder = this.withLikes(
      this.repository.createQueryBuilder('p'),
      userId,
    );

    if (blogId !== undefined) {
      builder.where('p.blog_id = :blogId', { blogId });
    }

    const direction = resolveSortDirection(query.sortDirection);
    builder
      .orderBy(resolveSortExpression(query.sortBy), direction)
      .addOrderBy('p.id', direction)
      .offset(query.calculateSkip())
      .limit(query.pageSize);

    //счётчик — отдельным запросом: getManyAndCount не дружит с getRawAndEntities.
    //raw[i] соответствует entities[i] только без join'ов (TypeORM дедуплицирует сущности)
    const [{ entities, raw }, totalCount] = await Promise.all([
      builder.getRawAndEntities<LikesRow>(),
      blogId !== undefined
        ? this.repository.countBy({ blogId })
        : this.repository.count(),
    ]);
    const newestLikes = await this.newestLikes(entities.map((post) => post.id));

    return PaginatedViewDto.mapToView({
      items: entities.map((post, index) =>
        this.toView(post, raw[index], newestLikes.get(post.id) ?? []),
      ),
      totalCount,
      page: query.pageNumber,
      size: query.pageSize,
    });
  }

  async getByIdOrNotFoundFail(
    id: string,
    userId: string | null = null,
  ): Promise<PostViewDto> {
    const { entities, raw } = isBigintId(id)
      ? await this.withLikes(
          this.repository.createQueryBuilder('p').where('p.id = :id', { id }),
          userId,
        ).getRawAndEntities<LikesRow>()
      : { entities: [], raw: [] };

    if (!entities.length) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Post not found',
      });
    }

    //ключ — id из сущности: в URL он мог прийти с ведущими нулями
    const post = entities[0];
    const newestLikes = await this.newestLikes([post.id]);
    return this.toView(post, raw[0], newestLikes.get(post.id) ?? []);
  }

  /**
   * Реакции считаются коррелированными подзапросами к post_likes: без join'а
   * строки постов не размножаются, и offset/limit работают как есть.
   * «Моя реакция» запрашивается только для авторизованного читателя.
   */
  private withLikes(
    builder: SelectQueryBuilder<Post>,
    userId: string | null,
  ): SelectQueryBuilder<Post> {
    builder
      .addSelect(
        (sub) =>
          sub
            .select('COUNT(*)')
            .from(PostLike, 'l')
            .where('l.post_id = p.id AND l.status = :like'),
        'likes_count',
      )
      .addSelect(
        (sub) =>
          sub
            .select('COUNT(*)')
            .from(PostLike, 'l')
            .where('l.post_id = p.id AND l.status = :dislike'),
        'dislikes_count',
      )
      .setParameters({ like: LikeStatus.Like, dislike: LikeStatus.Dislike });

    if (userId !== null) {
      builder
        .addSelect(
          (sub) =>
            sub
              .select('l.status')
              .from(PostLike, 'l')
              .where('l.post_id = p.id AND l.user_id = :userId'),
          'my_status',
        )
        .setParameter('userId', userId);
    }

    return builder;
  }

  /**
   * «Последние лайки» для всех постов страницы одним запросом: лайки
   * нумеруются внутри поста от новых к старым, берутся первые три.
   * Удалённые (мягко) пользователи не исключаются — их лайки остаются видны.
   */
  private async newestLikes(
    postIds: string[],
  ): Promise<Map<string, NewestLikeViewDto[]>> {
    const result = new Map<string, NewestLikeViewDto[]>();
    if (!postIds.length) return result;

    const rows = await this.repository.manager
      .createQueryBuilder()
      .select('ranked.post_id', 'post_id')
      .addSelect('ranked.user_id', 'user_id')
      .addSelect('ranked.added_at', 'added_at')
      .addSelect('u.login', 'login')
      .from(
        (sub) =>
          sub
            .select('l.post_id', 'post_id')
            .addSelect('l.user_id', 'user_id')
            .addSelect('l.added_at', 'added_at')
            .addSelect(
              'ROW_NUMBER() OVER (PARTITION BY l.post_id ORDER BY l.added_at DESC, l.user_id DESC)',
              'rn',
            )
            .from(PostLike, 'l')
            .where('l.post_id IN (:...postIds) AND l.status = :like', {
              postIds,
              like: LikeStatus.Like,
            }),
        'ranked',
      )
      //withDeleted — ДО join'а: TypeORM добавляет deleted_at IS NULL в момент join()
      .withDeleted()
      .innerJoin(User, 'u', 'u.id = ranked.user_id')
      .where('ranked.rn <= :limit', { limit: NEWEST_LIKES_LIMIT })
      .orderBy('ranked.post_id')
      .addOrderBy('ranked.added_at', 'DESC')
      .addOrderBy('ranked.user_id', 'DESC')
      .getRawMany<NewestLikeRow>();

    for (const row of rows) {
      const likes = result.get(row.post_id) ?? [];
      likes.push({
        addedAt: row.added_at.toISOString(),
        userId: row.user_id,
        login: row.login,
      });
      result.set(row.post_id, likes);
    }

    return result;
  }

  private toView(
    post: Post,
    likes: LikesRow,
    newestLikes: NewestLikeViewDto[],
  ): PostViewDto {
    return PostViewDto.mapToView(post, {
      likesCount: Number(likes.likes_count),
      dislikesCount: Number(likes.dislikes_count),
      myStatus: likes.my_status ?? LikeStatus.None,
      newestLikes,
    });
  }
}
