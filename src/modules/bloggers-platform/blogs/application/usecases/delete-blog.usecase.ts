import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BlogsTypeOrmRepository } from '../../infrastructure/typeorm/blogs.typeorm-repository';

export class DeleteBlogCommand {
  constructor(public id: string) {}
}

@CommandHandler(DeleteBlogCommand)
export class DeleteBlogUseCase implements ICommandHandler<
  DeleteBlogCommand,
  void
> {
  constructor(private blogsRepository: BlogsTypeOrmRepository) {}

  async execute({ id }: DeleteBlogCommand): Promise<void> {
    const blog = await this.blogsRepository.findOrNotFoundFail(id);
    await this.blogsRepository.delete(blog);
  }
}
