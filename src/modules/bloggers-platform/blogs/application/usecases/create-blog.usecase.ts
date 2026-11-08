import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateBlogInputDto } from '../../api/input-dto/create-blog.input-dto';
import { BlogsTypeOrmRepository } from '../../infrastructure/typeorm/blogs.typeorm-repository';

export class CreateBlogCommand {
  constructor(public dto: CreateBlogInputDto) {}
}

@CommandHandler(CreateBlogCommand)
export class CreateBlogUseCase implements ICommandHandler<
  CreateBlogCommand,
  string
> {
  constructor(private blogsRepository: BlogsTypeOrmRepository) {}

  async execute({ dto }: CreateBlogCommand): Promise<string> {
    const blog = this.blogsRepository.createInstance({
      name: dto.name,
      description: dto.description,
      websiteUrl: dto.websiteUrl,
    });

    await this.blogsRepository.save(blog);

    return blog.id;
  }
}
