import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreatePostForBlogInputDto } from '../../api/input-dto/create-post-for-blog.input-dto';
import { BlogsTypeOrmRepository } from '../../../blogs/infrastructure/typeorm/blogs.typeorm-repository';
import { PostsTypeOrmRepository } from '../../infrastructure/typeorm/posts.typeorm-repository';

//POST /sa/blogs/:blogId/posts — blogId берётся из пути, а не из тела
export class CreatePostForBlogCommand {
  constructor(
    public blogId: string,
    public dto: CreatePostForBlogInputDto,
  ) {}
}

@CommandHandler(CreatePostForBlogCommand)
export class CreatePostForBlogUseCase implements ICommandHandler<
  CreatePostForBlogCommand,
  string
> {
  constructor(
    private blogsRepository: BlogsTypeOrmRepository,
    private postsRepository: PostsTypeOrmRepository,
  ) {}

  async execute({ blogId, dto }: CreatePostForBlogCommand): Promise<string> {
    //404, если блога нет; его имя денормализуем в пост
    const blog = await this.blogsRepository.findOrNotFoundFail(blogId);

    const post = this.postsRepository.createInstance({
      title: dto.title,
      shortDescription: dto.shortDescription,
      content: dto.content,
      blogId: blog.id,
      blogName: blog.name,
    });

    await this.postsRepository.save(post);

    return post.id;
  }
}
