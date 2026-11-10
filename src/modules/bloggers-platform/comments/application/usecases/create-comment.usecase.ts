import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CommentsTypeOrmRepository } from '../../infrastructure/typeorm/comments.typeorm-repository';
import { PostsTypeOrmQueryRepository } from '../../../posts/infrastructure/typeorm/query/posts.typeorm-query-repository';
import { CreateCommentInputDto } from '../../api/input-dto/create-comment.input-dto';
import { UsersExternalQueryRepository } from '../../../../user-accounts/infrastructure/external-query/users.external-query-repository';

export class CreateCommentCommand {
  constructor(
    public postId: string,
    public userId: string,
    public dto: CreateCommentInputDto,
  ) {}
}

@CommandHandler(CreateCommentCommand)
export class CreateCommentUseCase implements ICommandHandler<
  CreateCommentCommand,
  string
> {
  constructor(
    private commentsRepository: CommentsTypeOrmRepository,
    private postsRepository: PostsTypeOrmQueryRepository,
    private usersExternalQueryRepository: UsersExternalQueryRepository,
  ) {}

  async execute({
    postId,
    userId,
    dto,
  }: CreateCommentCommand): Promise<string> {
    //404, если поста нет
    const post = await this.postsRepository.getByIdOrNotFoundFail(postId);

    //login денормализуем в комментарий, чтобы не джойнить users на чтении
    const user =
      await this.usersExternalQueryRepository.getByIdOrNotFoundFail(userId);

    const comment = this.commentsRepository.createInstance({
      content: dto.content,
      postId: post.id,
      userId: user.id,
      userLogin: user.login,
    });
    await this.commentsRepository.save(comment);

    return comment.id;
  }
}
