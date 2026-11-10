import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Like } from './like.entity';
import { Post } from '../../posts/domain/post.entity';
import { CreateLikeDomainDto } from './dto/create-like.domain.dto';

//Entity поверх существующей таблицы post_likes (см. init.sql); synchronize выключен
@Entity('post_likes')
@Index('post_likes_status_added_at_idx', [
  'postId',
  'status',
  'addedAt',
  'userId',
])
export class PostLike extends Like {
  @PrimaryColumn({ name: 'post_id', type: 'bigint' })
  postId: string;
  //удаление поста каскадно удаляет реакции на него — ограничение задано в БД
  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: Post;

  static createInstance(dto: CreateLikeDomainDto): PostLike {
    const like = new this();
    like.postId = dto.targetId;
    like.init(dto.userId, dto.status);
    return like;
  }
}
