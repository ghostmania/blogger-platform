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
import { Blog } from '../../blogs/domain/blog.entity';
import { CreatePostDomainDto } from './dto/create-post.domain.dto';
import { UpdatePostDomainDto } from './dto/update-post.domain.dto';

//Entity поверх существующей таблицы posts (см. init.sql); synchronize выключен
@Entity('posts')
@Index('posts_blog_id_created_at_idx', ['blogId', 'createdAt'])
export class Post {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;
  @Column({ type: 'varchar', length: 30 })
  title: string;
  @Column({ name: 'short_description', type: 'varchar', length: 100 })
  shortDescription: string;
  @Column({ type: 'varchar', length: 1000 })
  content: string;
  //FK хранится отдельной колонкой: по ней фильтруем и сортируем без join'а
  @Column({ name: 'blog_id', type: 'bigint' })
  blogId: string;
  //удаление блога каскадно удаляет его посты — ограничение задано в БД
  @ManyToOne(() => Blog, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blog_id' })
  blog: Blog;
  //имя блога денормализовано, чтобы не джойнить blogs при чтении постов
  @Column({ name: 'blog_name', type: 'varchar', length: 15 })
  blogName: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  static createInstance(dto: CreatePostDomainDto): Post {
    const post = new this();

    post.title = dto.title;
    post.shortDescription = dto.shortDescription;
    post.content = dto.content;
    post.blogId = dto.blogId;
    post.blogName = dto.blogName;

    return post;
  }

  update(dto: UpdatePostDomainDto): void {
    this.title = dto.title;
    this.shortDescription = dto.shortDescription;
    this.content = dto.content;
  }
}
