import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, QueryFailedError, Repository } from 'typeorm';
import { Like } from '../../domain/like.entity';
import { PostLike } from '../../domain/post-like.entity';
import { CommentLike } from '../../domain/comment-like.entity';
import { LikeStatus } from '../../../enums/like-status.enum';

const POSTGRES_UNIQUE_VIOLATION = '23505';

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
      return this.apply(this.postLikes, { postId: targetId, userId }, () =>
        PostLike.createInstance({ targetId, userId, status }),
      );
    }
    return this.apply(this.commentLikes, { commentId: targetId, userId }, () =>
      CommentLike.createInstance({ targetId, userId, status }),
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
  private async apply<T extends Like>(
    repository: Repository<T>,
    key: FindOptionsWhere<T>,
    create: () => T,
    retried = false,
  ): Promise<void> {
    const existing = await repository.findOneBy(key);

    if (existing) {
      if (existing.setStatus(create().status)) await repository.save(existing);
      return;
    }

    try {
      await repository.insert(create() as never);
    } catch (error) {
      if (retried || !this.isUniqueViolation(error)) throw error;
      await this.apply(repository, key, create, true);
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string } | undefined)?.code ===
        POSTGRES_UNIQUE_VIOLATION
    );
  }
}
