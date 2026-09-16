import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateBlogInputDto } from '../../api/input-dto/create-blog.input-dto';
import { BlogsSqlRepository } from '../../infrastructure/sql/blogs.sql-repository';

export class CreateBlogCommand {
  constructor(public dto: CreateBlogInputDto) {}
}

@CommandHandler(CreateBlogCommand)
export class CreateBlogUseCase implements ICommandHandler<
  CreateBlogCommand,
  string
> {
  constructor(
    private blogsRepository: BlogsSqlRepository,
  ) {}

  async execute({ dto }: CreateBlogCommand): Promise<string> {
    const blog = this.blogsRepository.createInstance({
      name: dto.name,
      description: dto.description,
      websiteUrl: dto.websiteUrl,
    });

    try {
      await this.blogsRepository.save(blog);
    } catch (error: unknown) {
      //страховка от гонки: два параллельных запроса могли пройти пре-чек
      //уникальности, но уникальный индекс пропустит только одного
      // this.throwIfDuplicateKeyError(error);
      throw error;
    }

    return blog.id;
  }
}
