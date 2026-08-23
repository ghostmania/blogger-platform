import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectModel } from '@nestjs/mongoose';
import { Comment, CommentModelType } from '../../domain/comment.entity';
import { CommentsRepository } from '../../infrastructure/comments.repository';
import { PostsRepository } from '../../../posts/infrastructure/posts.repository';
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
    @InjectModel(Comment.name)
    private CommentModel: CommentModelType,
    private commentsRepository: CommentsRepository,
    private postsRepository: PostsRepository,
    private usersExternalQueryRepository: UsersExternalQueryRepository,
  ) {}

  async execute({
    postId,
    userId,
    dto,
  }: CreateCommentCommand): Promise<string> {
    //404, если поста нет
    const post = await this.postsRepository.findOrNotFoundFail(postId);

    //login денормализуем в комментарий, чтобы не джойнить users на чтении
    const user =
      await this.usersExternalQueryRepository.getByIdOrNotFoundFail(userId);

    const comment = this.CommentModel.createInstance({
      content: dto.content,
      postId: post._id.toString(),
      userId: user.id,
      userLogin: user.login,
    });

    await this.commentsRepository.save(comment);

    return comment._id.toString();
  }
}
