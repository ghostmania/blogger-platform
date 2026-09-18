import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../core/database/database.constants';
import { DomainException } from '../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../core/exceptions/domain-exception-codes';
import { CreatePostForBlogInputDto } from '../bloggers-platform/posts/api/input-dto/create-post-for-blog.input-dto';
import { UpdatePostForBlogInputDto } from '../bloggers-platform/posts/api/input-dto/update-post-for-blog.input-dto';

type Row = {
  id: string;
  title: string;
  short_description: string;
  content: string;
  blog_id: string;
  blog_name: string;
  created_at: Date;
  total_count?: string;
};
export type AdminPostView = {
  id: string;
  title: string;
  shortDescription: string;
  content: string;
  blogId: string;
  blogName: string;
  createdAt: Date;
  extendedLikesInfo: {
    likesCount: number;
    dislikesCount: number;
    myStatus: 'None';
    newestLikes: [];
  };
};

@Injectable()
export class AdminBlogPostsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(
    blogId: string,
    dto: CreatePostForBlogInputDto,
  ): Promise<AdminPostView> {
    const blog = await this.blog(blogId);
    const { rows } = await this.pool.query<Row>(
      `INSERT INTO posts (title, short_description, content, blog_id, blog_name)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, title, short_description, content, blog_id, blog_name, created_at`,
      [dto.title, dto.shortDescription, dto.content, blogId, blog.name],
    );
    return this.view(rows[0]);
  }

  async update(
    blogId: string,
    postId: string,
    dto: UpdatePostForBlogInputDto,
  ): Promise<void> {
    await this.blog(blogId);
    if (!this.numeric(postId)) this.notFound('Post not found');
    const { rowCount } = await this.pool.query(
      `UPDATE posts
       SET title = $3,
           short_description = $4,
           content = $5,
           updated_at = now()
       WHERE id = $1
         AND blog_id = $2`,
      [postId, blogId, dto.title, dto.shortDescription, dto.content],
    );
    if (!rowCount) this.notFound('Post not found');
  }

  async delete(blogId: string, postId: string): Promise<void> {
    await this.blog(blogId);
    if (!this.numeric(postId)) this.notFound('Post not found');
    const { rowCount } = await this.pool.query(
      'DELETE FROM posts WHERE id = $1 AND blog_id = $2',
      [postId, blogId],
    );
    if (!rowCount) this.notFound('Post not found');
  }

  private async blog(id: string): Promise<{ name: string }> {
    if (!this.numeric(id)) this.notFound('Blog not found');
    const { rows } = await this.pool.query<{ name: string }>(
      'SELECT name FROM blogs WHERE id = $1',
      [id],
    );
    if (!rows.length) this.notFound('Blog not found');
    return rows[0];
  }

  private view(row: Row): AdminPostView {
    return {
      id: row.id,
      title: row.title,
      shortDescription: row.short_description,
      content: row.content,
      blogId: row.blog_id,
      blogName: row.blog_name,
      createdAt: row.created_at,
      extendedLikesInfo: {
        likesCount: 0,
        dislikesCount: 0,
        myStatus: 'None',
        newestLikes: [],
      },
    };
  }

  private numeric(id: string): boolean {
    return /^\d+$/.test(id);
  }

  private notFound(message: string): never {
    throw new DomainException({ code: DomainExceptionCode.NotFound, message });
  }
}
