import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateBlogInputDto } from '../../api/input-dto/update-blog.input-dto';
import { BlogsTypeOrmRepository } from '../../infrastructure/typeorm/blogs.typeorm-repository';
import { PostsTypeOrmRepository } from '../../../posts/infrastructure/typeorm/posts.typeorm-repository';

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
  constructor(
    private blogsRepository: BlogsTypeOrmRepository,
    private postsRepository: PostsTypeOrmRepository,
  ) {}

  async execute({ id, dto }: UpdateBlogCommand): Promise<void> {
    const blog = await this.blogsRepository.findOrNotFoundFail(id);
    const nameChanged = blog.name !== dto.name;

    blog.update(dto);
    await this.blogsRepository.save(blog);

    //blogName денормализован в постах — иначе после переименования они отдавали бы старое имя
    if (nameChanged) {
      await this.postsRepository.updateBlogName(blog.id, blog.name);
    }
  }
}
