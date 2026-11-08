import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdatePostForBlogInputDto } from '../../api/input-dto/update-post-for-blog.input-dto';
import { BlogsTypeOrmRepository } from '../../../blogs/infrastructure/typeorm/blogs.typeorm-repository';
import { PostsTypeOrmRepository } from '../../infrastructure/typeorm/posts.typeorm-repository';

//PUT /sa/blogs/:blogId/posts/:postId
export class UpdatePostForBlogCommand {
  constructor(
    public blogId: string,
    public postId: string,
    public dto: UpdatePostForBlogInputDto,
  ) {}
}

@CommandHandler(UpdatePostForBlogCommand)
export class UpdatePostForBlogUseCase implements ICommandHandler<
  UpdatePostForBlogCommand,
  void
> {
  constructor(
    private blogsRepository: BlogsTypeOrmRepository,
    private postsRepository: PostsTypeOrmRepository,
  ) {}

  async execute({
    blogId,
    postId,
    dto,
  }: UpdatePostForBlogCommand): Promise<void> {
    await this.blogsRepository.findOrNotFoundFail(blogId);
    const post = await this.postsRepository.findInBlogOrNotFoundFail(
      blogId,
      postId,
    );

    post.update(dto);
    await this.postsRepository.save(post);
  }
}
