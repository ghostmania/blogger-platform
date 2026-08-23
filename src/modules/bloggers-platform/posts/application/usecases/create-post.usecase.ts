import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectModel } from '@nestjs/mongoose';
import { Post, PostModelType } from '../../domain/post.entity';
import { PostsRepository } from '../../infrastructure/posts.repository';
import { BlogsRepository } from '../../../blogs/infrastructure/blogs.repository';
import { CreatePostInputDto } from '../../api/input-dto/create-post.input-dto';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';

export class CreatePostCommand {
  constructor(public dto: CreatePostInputDto) {}
}

//POST /posts — blogId приходит в теле; несуществующий blog -> 400
@CommandHandler(CreatePostCommand)
export class CreatePostUseCase implements ICommandHandler<
  CreatePostCommand,
  string
> {
  constructor(
    @InjectModel(Post.name)
    private PostModel: PostModelType,
    private postsRepository: PostsRepository,
    private blogsRepository: BlogsRepository,
  ) {}

  async execute({ dto }: CreatePostCommand): Promise<string> {
    const blog = await this.blogsRepository.findById(dto.blogId);

    if (!blog) {
      throw new DomainException({
        code: DomainExceptionCode.BadRequest,
        message: 'blog not found',
        extensions: [{ message: 'blog not found', key: 'blogId' }],
      });
    }

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
