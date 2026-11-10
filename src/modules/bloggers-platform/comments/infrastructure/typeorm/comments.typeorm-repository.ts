import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../../domain/comment.entity';
import { CreateCommentDomainDto } from '../../domain/dto/create-comment.domain.dto';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { isBigintId } from '../../../../../core/database/bigint-id';

@Injectable()
export class CommentsTypeOrmRepository {
  constructor(
    @InjectRepository(Comment)
    private readonly repository: Repository<Comment>,
  ) {}

  createInstance(dto: CreateCommentDomainDto): Comment {
    return Comment.createInstance(dto);
  }

  async save(comment: Comment): Promise<void> {
    await this.repository.save(comment);
  }

  findById(id: string): Promise<Comment | null> {
    if (!isBigintId(id)) return Promise.resolve(null);
    return this.repository.findOneBy({ id });
  }

  async findOrNotFoundFail(id: string): Promise<Comment> {
    const comment = await this.findById(id);
    if (!comment) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Comment not found',
      });
    }
    return comment;
  }

  async delete(comment: Comment): Promise<void> {
    await this.repository.delete({ id: comment.id });
  }
}
