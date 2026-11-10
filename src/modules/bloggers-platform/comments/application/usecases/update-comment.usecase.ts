import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CommentsTypeOrmRepository } from '../../infrastructure/typeorm/comments.typeorm-repository';
import { UpdateCommentInputDto } from '../../api/input-dto/update-comment.input-dto';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';

export class UpdateCommentCommand {
  constructor(
    public commentId: string,
    public userId: string,
    public dto: UpdateCommentInputDto,
  ) {}
}

@CommandHandler(UpdateCommentCommand)
export class UpdateCommentUseCase implements ICommandHandler<
  UpdateCommentCommand,
  void
> {
  constructor(private commentsRepository: CommentsTypeOrmRepository) {}

  async execute({
    commentId,
    userId,
    dto,
  }: UpdateCommentCommand): Promise<void> {
    const comment = await this.commentsRepository.findOrNotFoundFail(commentId);

    //чужой комментарий редактировать нельзя -> 403
    if (!comment.isAuthoredBy(userId)) {
      throw new DomainException({
        code: DomainExceptionCode.Forbidden,
        message: 'comment belongs to another user',
      });
    }

    comment.update({ content: dto.content });
    await this.commentsRepository.save(comment);
  }
}
