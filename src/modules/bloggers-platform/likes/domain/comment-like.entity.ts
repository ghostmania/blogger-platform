import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Like } from './like.entity';
import { Comment } from '../../comments/domain/comment.entity';
import { CreateLikeDomainDto } from './dto/create-like.domain.dto';

//Entity поверх существующей таблицы comment_likes (см. init.sql); synchronize выключен
@Entity('comment_likes')
@Index('comment_likes_status_added_at_idx', [
  'commentId',
  'status',
  'addedAt',
  'userId',
])
export class CommentLike extends Like {
  @PrimaryColumn({ name: 'comment_id', type: 'bigint' })
  commentId: string;
  //удаление комментария каскадно удаляет реакции на него — ограничение задано в БД
  @ManyToOne(() => Comment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'comment_id' })
  comment: Comment;

  static createInstance(dto: CreateLikeDomainDto): CommentLike {
    const like = new this();
    like.commentId = dto.targetId;
    like.init(dto.userId, dto.status);
    return like;
  }
}
