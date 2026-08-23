import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectModel } from '@nestjs/mongoose';
import { Blog, BlogModelType } from '../../domain/blog.entity';
import { BlogsRepository } from '../../infrastructure/blogs.repository';
import { CreateBlogInputDto } from '../../api/input-dto/create-blog.input-dto';

export class CreateBlogCommand {
  constructor(public dto: CreateBlogInputDto) {}
}

@CommandHandler(CreateBlogCommand)
export class CreateBlogUseCase implements ICommandHandler<
  CreateBlogCommand,
  string
> {
  constructor(
    //инжектирование модели через DI
    @InjectModel(Blog.name)
    private BlogModel: BlogModelType,
    private blogsRepository: BlogsRepository,
  ) {}

  async execute({ dto }: CreateBlogCommand): Promise<string> {
    const blog = this.BlogModel.createInstance({
      name: dto.name,
      description: dto.description,
      websiteUrl: dto.websiteUrl,
    });

    await this.blogsRepository.save(blog);

    return blog._id.toString();
  }
}
