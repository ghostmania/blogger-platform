import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Post } from '../../posts/domain/post.entity';
import { User } from '../../../user-accounts/domain/user.entity';
import { CreateCommentDomainDto } from './dto/create-comment.domain.dto';
import { UpdateCommentDomainDto } from './dto/update-comment.domain.dto';

//Entity поверх существующей таблицы comments (см. init.sql); synchronize выключен
@Entity('comments')
@Index('comments_post_id_created_at_idx', ['postId', 'createdAt'])
export class Comment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;
  @Column({ type: 'varchar', length: 300 })
  content: string;
  //FK хранятся отдельными колонками: по ним фильтруем и проверяем автора без join'а
  @Column({ name: 'post_id', type: 'bigint' })
  postId: string;
  //удаление поста каскадно удаляет его комментарии — ограничение задано в БД
  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: Post;
  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
  //логин автора денормализован, чтобы не джойнить users при чтении комментариев
  @Column({ name: 'user_login', type: 'varchar', length: 10 })
  userLogin: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  static createInstance(dto: CreateCommentDomainDto): Comment {
    const comment = new this();

    comment.content = dto.content;
    comment.postId = dto.postId;
    comment.userId = dto.userId;
    comment.userLogin = dto.userLogin;

    return comment;
  }

  update(dto: UpdateCommentDomainDto): void {
    this.content = dto.content;
  }

  //редактировать и удалять комментарий может только его автор
  isAuthoredBy(userId: string): boolean {
    return this.userId === userId;
  }
}
