import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BlogsTypeOrmRepository } from '../../../blogs/infrastructure/typeorm/blogs.typeorm-repository';
import { PostsTypeOrmRepository } from '../../infrastructure/typeorm/posts.typeorm-repository';

//DELETE /sa/blogs/:blogId/posts/:postId
export class DeletePostForBlogCommand {
  constructor(
    public blogId: string,
    public postId: string,
  ) {}
}

@CommandHandler(DeletePostForBlogCommand)
export class DeletePostForBlogUseCase implements ICommandHandler<
  DeletePostForBlogCommand,
  void
> {
  constructor(
    private blogsRepository: BlogsTypeOrmRepository,
    private postsRepository: PostsTypeOrmRepository,
  ) {}

  async execute({ blogId, postId }: DeletePostForBlogCommand): Promise<void> {
    await this.blogsRepository.findOrNotFoundFail(blogId);
    const post = await this.postsRepository.findInBlogOrNotFoundFail(
      blogId,
      postId,
    );

    await this.postsRepository.delete(post);
  }
}
