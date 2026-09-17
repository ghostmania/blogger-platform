import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateBlogInputDto } from '../../api/input-dto/update-blog.input-dto';
import { BlogsSqlRepository } from '../../infrastructure/sql/blogs.sql-repository';

export class UpdateBlogCommand {
  constructor(
    public id: string,
    public dto: UpdateBlogInputDto,
  ) {}
}

@CommandHandler(UpdateBlogCommand)
export class UpdateBlogUseCase implements ICommandHandler<
  UpdateBlogCommand,
  void
> {
  constructor(private blogsRepository: BlogsSqlRepository) {}

  async execute({ id, dto }: UpdateBlogCommand): Promise<void> {
    const blog = await this.blogsRepository.findOrNotFoundFail(id);
    blog.update(dto);
    await this.blogsRepository.save(blog);
  }
}
