import { Column, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from '../../../user-accounts/domain/user.entity';
import { LikeStatus } from '../../enums/like-status.enum';

/**
 * Общая часть реакции на пост и на комментарий: кто, какой статус и когда.
 * Не Entity сама по себе — наследники натягиваются на свои таблицы
 * (post_likes / comment_likes), а колонки базового класса наследуют.
 */
export abstract class Like {
  @PrimaryColumn({ name: 'user_id', type: 'bigint' })
  userId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
  @Column({ type: 'varchar', length: 7 })
  status: LikeStatus;
  //время последней смены статуса — по нему строятся «последние лайки»
  @Column({ name: 'added_at', type: 'timestamptz' })
  addedAt: Date;

  protected init(userId: string, status: LikeStatus): void {
    this.userId = userId;
    this.status = status;
    this.addedAt = new Date();
  }

  /**
   * Повторная установка того же статуса — не новая реакция: время не меняется,
   * метод сообщает, что сохранять нечего. Смена статуса обновляет время.
   */
  setStatus(status: LikeStatus): boolean {
    if (this.status === status) return false;
    this.status = status;
    this.addedAt = new Date();
    return true;
  }
}
