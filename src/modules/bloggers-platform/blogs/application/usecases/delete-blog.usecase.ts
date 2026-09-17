import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BlogsSqlRepository } from '../../infrastructure/sql/blogs.sql-repository';

export class DeleteBlogCommand {
  constructor(public id: string) {}
}

@CommandHandler(DeleteBlogCommand)
export class DeleteBlogUseCase implements ICommandHandler<
  DeleteBlogCommand,
  void
> {
  constructor(private blogsRepository: BlogsSqlRepository) {}

  async execute({ id }: DeleteBlogCommand): Promise<void> {
    await this.blogsRepository.deleteById(id);
  }
}
