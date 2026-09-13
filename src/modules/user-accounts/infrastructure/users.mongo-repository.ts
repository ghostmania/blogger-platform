import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { User, UserDocument, UserModelType } from '../domain/user.entity';
import { CreateUserDomainDto } from '../domain/dto/create-user.domain.dto';
import { UsersRepository } from './users.repository.abstract';
import { DomainException } from '../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../core/exceptions/domain-exception-codes';

/**
 * MongoDB-реализация контракта UsersRepository.
 *
 * Сравните с UsersSqlRepository (infrastructure/sql/users.sql-repository.ts):
 * контракт один и тот же, а вся разница — здесь запросы описываются объектами
 * ({ login, deletedAt: null }), там строками SQL с параметрами $1.
 * Сохранение здесь — document.save() (мангуст сам отслеживает изменения),
 * там — явный INSERT либо UPDATE.
 */
@Injectable()
export class UsersMongoRepository extends UsersRepository {
  //инжектирование модели через DI
  constructor(@InjectModel(User.name) private UserModel: UserModelType) {
    super();
  }

  createInstance(dto: CreateUserDomainDto): UserDocument {
    return this.UserModel.createInstance(dto);
  }

  async save(user: UserDocument): Promise<void> {
    await user.save();
  }

  async findById(id: string): Promise<UserDocument | null> {
    //контроллер общий для обеих реализаций, поэтому IdValidationPipe пропускает
    //и ObjectId, и число. Числовой id — валидный для SQL-режима, но мангуст
    //на нём падает с CastError (500). «Чужой формат» = «не найдено», то есть null:
    //дальше findOrNotFoundFail превратит его в честный 404
    if (!isValidObjectId(id)) {
      return null;
    }

    return this.UserModel.findOne({
      _id: id,
      deletedAt: null,
    });
  }

  async findOrNotFoundFail(id: string): Promise<UserDocument> {
    const user = await this.findById(id);

    if (!user) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'User not found',
      });
    }

    return user;
  }

  findByLogin(login: string): Promise<UserDocument | null> {
    return this.UserModel.findOne({
      login,
      deletedAt: null,
    });
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.UserModel.findOne({
      email,
      deletedAt: null,
    });
  }

  findByLoginOrEmail(loginOrEmail: string): Promise<UserDocument | null> {
    return this.UserModel.findOne({
      $or: [{ login: loginOrEmail }, { email: loginOrEmail }],
      deletedAt: null,
    });
  }

  findByConfirmationCode(code: string): Promise<UserDocument | null> {
    return this.UserModel.findOne({
      'emailConfirmation.confirmationCode': code,
      deletedAt: null,
    });
  }

  findByPasswordRecoveryCode(code: string): Promise<UserDocument | null> {
    return this.UserModel.findOne({
      'passwordRecovery.recoveryCode': code,
      deletedAt: null,
    });
  }
}
