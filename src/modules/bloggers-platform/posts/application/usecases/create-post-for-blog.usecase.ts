import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectModel } from '@nestjs/mongoose';
import { Post, PostModelType } from '../../domain/post.entity';
import { PostsRepository } from '../../infrastructure/posts.repository';
import { BlogsRepository } from '../../../blogs/infrastructure/blogs.repository';
import { CreatePostForBlogInputDto } from '../../api/input-dto/create-post-for-blog.input-dto';

export class CreatePostForBlogCommand {
  constructor(
    public blogId: string,
    public dto: CreatePostForBlogInputDto,
  ) {}
}

//POST /blogs/:blogId/posts — blogId из пути; несуществующий blog -> 404
@CommandHandler(CreatePostForBlogCommand)
export class CreatePostForBlogUseCase implements ICommandHandler<
  CreatePostForBlogCommand,
  string
> {
  constructor(
    @InjectModel(Post.name)
    private PostModel: PostModelType,
    private postsRepository: PostsRepository,
    private blogsRepository: BlogsRepository,
  ) {}

  async execute({ blogId, dto }: CreatePostForBlogCommand): Promise<string> {
    const blog = await this.blogsRepository.findOrNotFoundFail(blogId);

    const post = this.PostModel.createInstance({
      title: dto.title,
      shortDescription: dto.shortDescription,
      content: dto.content,
      blogId: blog._id.toString(),
      blogName: blog.name,
    });

    await this.postsRepository.save(post);

    return post._id.toString();
  }
}
