import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, QueryFailedError, Repository } from 'typeorm';
import { Like } from '../../domain/like.entity';
import { PostLike } from '../../domain/post-like.entity';
import { CommentLike } from '../../domain/comment-like.entity';
import { LikeStatus } from '../../../enums/like-status.enum';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';

const POSTGRES_UNIQUE_VIOLATION = '23505';
const POSTGRES_FOREIGN_KEY_VIOLATION = '23503';

export type LikeTarget = 'post' | 'comment';

/**
 * Один репозиторий на обе таблицы реакций: правила записи у постов и
 * комментариев одинаковые, различается только целевая сущность.
 */
@Injectable()
export class LikesTypeOrmRepository {
  constructor(
    @InjectRepository(PostLike)
    private readonly postLikes: Repository<PostLike>,
    @InjectRepository(CommentLike)
    private readonly commentLikes: Repository<CommentLike>,
  ) {}

  setStatus(
    target: LikeTarget,
    targetId: string,
    userId: string,
    status: LikeStatus,
  ): Promise<void> {
    if (target === 'post') {
      return this.upsert(
        this.postLikes,
        { postId: targetId, userId },
        () => PostLike.createInstance({ targetId, userId, status }),
        status,
      );
    }
    return this.upsert(
      this.commentLikes,
      { commentId: targetId, userId },
      () => CommentLike.createInstance({ targetId, userId, status }),
      status,
    );
  }

  /**
   * Реакция пары «цель – пользователь» одна: нашли — меняем статус через
   * сущность (повтор того же статуса ничего не пишет), не нашли — вставляем.
   * Одинаковые запросы могут прийти одновременно: оба не находят строку, оба
   * вставляют, второй падает на первичном ключе — тогда один повтор уже
   * найдёт строку и обработает её как обновление. Строки со статусом None
   * остаются: именно по ключу сериализуются конкурентные записи.
   */
  private async upsert<T extends Like>(
    repository: Repository<T>,
    key: FindOptionsWhere<T>,
    create: () => T,
    status: LikeStatus,
    retried = false,
  ): Promise<void> {
    const existing = await repository.findOneBy(key);

    if (existing) {
      if (existing.setStatus(status)) await repository.save(existing);
      return;
    }

    try {
      await repository.insert(create() as never);
    } catch (error) {
      if (!retried && this.isViolation(error, POSTGRES_UNIQUE_VIOLATION)) {
        return this.upsert(repository, key, create, status, true);
      }
      //цель удалили между проверкой существования и вставкой — это 404, не 500
      if (this.isViolation(error, POSTGRES_FOREIGN_KEY_VIOLATION)) {
        throw new DomainException({
          code: DomainExceptionCode.NotFound,
          message: 'Reaction target not found',
        });
      }
      throw error;
    }
  }

  private isViolation(error: unknown, code: string): boolean {
    return (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string } | undefined)?.code === code
    );
  }
}
