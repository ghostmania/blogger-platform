import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Post, PostModelType } from './domain/post.entity';
import { PostsRepository } from './infrastructure/posts.repository';
import { BlogsRepository } from './infrastructure/blogs.repository';
import { CreatePostDomainDto } from './domain/dto/create-post.domain.dto';
import { CreatePostInputDto } from './api/posts/input-dto/create-post.input-dto';
import { CreatePostForBlogInputDto } from './api/posts/input-dto/create-post-for-blog.input-dto';
import { UpdatePostInputDto } from './api/posts/input-dto/update-post.input-dto';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name)
    private PostModel: PostModelType,
    private postsRepository: PostsRepository,
    private blogsRepository: BlogsRepository,
  ) {}

  //POST /posts — blogId в теле; несуществующий blog -> 400
  async createPost(dto: CreatePostInputDto): Promise<string> {
    const blog = await this.blogsRepository.findById(dto.blogId);

    if (!blog) {
      throw new BadRequestException([
        { field: 'blogId', message: 'blog not found' },
      ]);
    }

    return this.create({
      title: dto.title,
      shortDescription: dto.shortDescription,
      content: dto.content,
      blogId: blog._id.toString(),
      blogName: blog.name,
    });
  }

  //POST /blogs/:blogId/posts — blogId из пути; несуществующий blog -> 404
  async createPostForBlog(
    blogId: string,
    dto: CreatePostForBlogInputDto,
  ): Promise<string> {
    const blog = await this.blogsRepository.findOrNotFoundFail(blogId);

    return this.create({
      title: dto.title,
      shortDescription: dto.shortDescription,
      content: dto.content,
      blogId: blog._id.toString(),
      blogName: blog.name,
    });
  }

  async updatePost(id: string, dto: UpdatePostInputDto): Promise<string> {
    const post = await this.postsRepository.findOrNotFoundFail(id);

    post.update(dto);

    await this.postsRepository.save(post);

    return post._id.toString();
  }

  async deletePost(id: string): Promise<void> {
    const post = await this.postsRepository.findOrNotFoundFail(id);

    post.makeDeleted();

    await this.postsRepository.save(post);
  }

  private async create(dto: CreatePostDomainDto): Promise<string> {
    const post = this.PostModel.createInstance(dto);

    await this.postsRepository.save(post);

    return post._id.toString();
  }
}
