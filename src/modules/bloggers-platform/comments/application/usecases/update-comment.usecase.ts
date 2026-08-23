import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CommentsRepository } from '../../infrastructure/comments.repository';
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
  constructor(private commentsRepository: CommentsRepository) {}

  async execute({
    commentId,
    userId,
    dto,
  }: UpdateCommentCommand): Promise<void> {
    const comment = await this.commentsRepository.findOrNotFoundFail(commentId);

    //чужой комментарий редактировать нельзя -> 403
    if (!comment.isOwnedBy(userId)) {
      throw new DomainException({
        code: DomainExceptionCode.Forbidden,
        message: 'comment belongs to another user',
      });
    }

    comment.update(dto);

    await this.commentsRepository.save(comment);
  }
}
