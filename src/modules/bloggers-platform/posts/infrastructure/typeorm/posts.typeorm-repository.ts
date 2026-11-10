import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '../../domain/post.entity';
import { CreatePostDomainDto } from '../../domain/dto/create-post.domain.dto';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { isBigintId } from '../../../../../core/database/bigint-id';

@Injectable()
export class PostsTypeOrmRepository {
  constructor(
    @InjectRepository(Post) private readonly repository: Repository<Post>,
  ) {}

  createInstance(dto: CreatePostDomainDto): Post {
    return Post.createInstance(dto);
  }

  async save(post: Post): Promise<void> {
    await this.repository.save(post);
  }

  findById(id: string): Promise<Post | null> {
    if (!isBigintId(id)) return Promise.resolve(null);
    return this.repository.findOneBy({ id });
  }

  async findOrNotFoundFail(id: string): Promise<Post> {
    const post = await this.findById(id);
    if (!post) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Post not found',
      });
    }
    return post;
  }

  //пост ищем строго внутри блога из URL: чужой пост для этого блога — 404
  findInBlog(blogId: string, postId: string): Promise<Post | null> {
    if (!isBigintId(blogId) || !isBigintId(postId)) {
      return Promise.resolve(null);
    }
    return this.repository.findOneBy({ id: postId, blogId });
  }

  async findInBlogOrNotFoundFail(
    blogId: string,
    postId: string,
  ): Promise<Post> {
    const post = await this.findInBlog(blogId, postId);
    if (!post) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Post not found',
      });
    }
    return post;
  }

  async delete(post: Post): Promise<void> {
    await this.repository.delete({ id: post.id });
  }

  //blogName денормализован в постах — при переименовании блога обновляем копии
  async updateBlogName(blogId: string, blogName: string): Promise<void> {
    await this.repository.update({ blogId }, { blogName });
  }
}
