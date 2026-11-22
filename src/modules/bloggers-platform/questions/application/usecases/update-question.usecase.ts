import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { QuestionInputDto } from '../../api/input-dto/question.input-dto';
import { QuestionsTypeOrmRepository } from '../../infrastructure/typeorm/questions.typeorm-repository';

export class UpdateQuestionCommand {
  constructor(
    public id: string,
    public dto: QuestionInputDto,
  ) {}
}

@CommandHandler(UpdateQuestionCommand)
export class UpdateQuestionUseCase implements ICommandHandler<
  UpdateQuestionCommand,
  void
> {
  constructor(private questionsRepository: QuestionsTypeOrmRepository) {}

  async execute({ id, dto }: UpdateQuestionCommand): Promise<void> {
    const question = await this.questionsRepository.findOrNotFoundFail(id);

    question.update({ body: dto.body, correctAnswers: dto.correctAnswers });

    await this.questionsRepository.save(question);
  }
}
