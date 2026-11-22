import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { QuestionsTypeOrmRepository } from '../../infrastructure/typeorm/questions.typeorm-repository';

export class PublishQuestionCommand {
  constructor(
    public id: string,
    public published: boolean,
  ) {}
}

@CommandHandler(PublishQuestionCommand)
export class PublishQuestionUseCase implements ICommandHandler<
  PublishQuestionCommand,
  void
> {
  constructor(private questionsRepository: QuestionsTypeOrmRepository) {}

  async execute({ id, published }: PublishQuestionCommand): Promise<void> {
    const question = await this.questionsRepository.findOrNotFoundFail(id);

    question.publish(published);

    await this.questionsRepository.save(question);
  }
}
