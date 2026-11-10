import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Comment } from '../../../domain/comment.entity';
import { CommentViewDto } from '../../../api/view-dto/comments.view-dto';
import { GetCommentsQueryParams } from '../../../api/input-dto/get-comments-query-params.input-dto';
import { PaginatedViewDto } from '../../../../../../core/dto/base.paginated.view-dto';
import { DomainException } from '../../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../../core/exceptions/domain-exception-codes';
import { isBigintId } from '../../../../../../core/database/bigint-id';
import { LikeStatus } from '../../../../enums/like-status.enum';
import { CommentLike } from '../../../../likes/domain/comment-like.entity';
import {
  resolveSortColumn,
  resolveSortDirection,
} from './comments-sort-columns';

//сырые колонки реакций, которые добавляются к выборке комментариев
type LikesRow = {
  likes_count: string;
  dislikes_count: string;
  my_status: LikeStatus | null;
};

@Injectable()
export class CommentsTypeOrmQueryRepository {
  constructor(
    @InjectRepository(Comment)
    private readonly repository: Repository<Comment>,
  ) {}

  async getByIdOrNotFoundFail(
    id: string,
    userId: string | null = null,
  ): Promise<CommentViewDto> {
    const { entities, raw } = isBigintId(id)
      ? await this.withLikes(
          this.repository.createQueryBuilder('c').where('c.id = :id', { id }),
          userId,
        ).getRawAndEntities<LikesRow>()
      : { entities: [], raw: [] };

    if (!entities.length) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Comment not found',
      });
    }

    return this.toView(entities[0], raw[0]);
  }

  async getAllForPost(
    postId: string,
    query: GetCommentsQueryParams,
    userId: string | null = null,
  ): Promise<PaginatedViewDto<CommentViewDto[]>> {
    const direction = resolveSortDirection(query.sortDirection);
    const builder = this.withLikes(
      this.repository
        .createQueryBuilder('c')
        .where('c.post_id = :postId', { postId }),
      userId,
    )
      .orderBy(`c.${resolveSortColumn(query.sortBy)}`, direction)
      .addOrderBy('c.id', direction)
      .offset(query.calculateSkip())
      .limit(query.pageSize);

    //счётчик — отдельным запросом: getManyAndCount не дружит с getRawAndEntities
    const [{ entities, raw }, totalCount] = await Promise.all([
      builder.getRawAndEntities<LikesRow>(),
      this.repository.countBy({ postId }),
    ]);

    return PaginatedViewDto.mapToView({
      items: entities.map((comment, index) => this.toView(comment, raw[index])),
      totalCount,
      page: query.pageNumber,
      size: query.pageSize,
    });
  }

  /**
   * Реакции считаются коррелированными подзапросами к comment_likes: без join'а
   * строки комментариев не размножаются, и offset/limit работают как есть.
   * «Моя реакция» запрашивается только для авторизованного читателя.
   */
  private withLikes(
    builder: SelectQueryBuilder<Comment>,
    userId: string | null,
  ): SelectQueryBuilder<Comment> {
    builder
      .addSelect(
        (sub) =>
          sub
            .select('COUNT(*)')
            .from(CommentLike, 'l')
            .where('l.comment_id = c.id AND l.status = :like'),
        'likes_count',
      )
      .addSelect(
        (sub) =>
          sub
            .select('COUNT(*)')
            .from(CommentLike, 'l')
            .where('l.comment_id = c.id AND l.status = :dislike'),
        'dislikes_count',
      )
      .setParameters({ like: LikeStatus.Like, dislike: LikeStatus.Dislike });

    if (userId !== null) {
      builder
        .addSelect(
          (sub) =>
            sub
              .select('l.status')
              .from(CommentLike, 'l')
              .where('l.comment_id = c.id AND l.user_id = :userId'),
          'my_status',
        )
        .setParameter('userId', userId);
    }

    return builder;
  }

  private toView(comment: Comment, likes: LikesRow): CommentViewDto {
    return CommentViewDto.mapToView(comment, {
      likesCount: Number(likes.likes_count),
      dislikesCount: Number(likes.dislikes_count),
      myStatus: likes.my_status ?? LikeStatus.None,
    });
  }
}
