import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BlogsRepository } from '../../infrastructure/blogs.repository';

export class DeleteBlogCommand {
  constructor(public id: string) {}
}

@CommandHandler(DeleteBlogCommand)
export class DeleteBlogUseCase implements ICommandHandler<
  DeleteBlogCommand,
  void
> {
  constructor(private blogsRepository: BlogsRepository) {}

  async execute({ id }: DeleteBlogCommand): Promise<void> {
    const blog = await this.blogsRepository.findOrNotFoundFail(id);

    blog.makeDeleted();

    await this.blogsRepository.save(blog);
  }
}
