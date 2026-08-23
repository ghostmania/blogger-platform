import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BlogsRepository } from '../../infrastructure/blogs.repository';
import { UpdateBlogInputDto } from '../../api/input-dto/update-blog.input-dto';

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
  constructor(private blogsRepository: BlogsRepository) {}

  async execute({ id, dto }: UpdateBlogCommand): Promise<void> {
    const blog = await this.blogsRepository.findOrNotFoundFail(id);

    // не присваиваем св-ва сущностям напрямую — вызываем метод сущности
    blog.update(dto); // change detection

    await this.blogsRepository.save(blog);
  }
}
