import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../domain/user.entity';
import { CreateUserDomainDto } from '../../domain/dto/create-user.domain.dto';
import { UsersRepository } from '../users.repository.abstract';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class UsersTypeOrmRepository extends UsersRepository {
  constructor(
    @InjectRepository(User) private readonly repository: Repository<User>,
  ) {
    super();
  }

  createInstance(dto: CreateUserDomainDto): User {
    return User.createInstance(dto);
  }

  async save(user: User): Promise<void> {
    await this.repository.save(user);
  }

  async deleteById(id: string): Promise<void> {
    const user = await this.findById(id);
    if (user) await this.repository.softDelete(id);
  }

  findById(id: string): Promise<User | null> {
    if (!/^\d+$/.test(id) || BigInt(id) > 9223372036854775807n)
      return Promise.resolve(null);
    return this.repository.findOneBy({ id });
  }

  async findOrNotFoundFail(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user)
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'User not found',
      });
    return user;
  }

  findByLogin(login: string): Promise<User | null> {
    return this.repository.findOneBy({ login });
  }
  findByEmail(email: string): Promise<User | null> {
    return this.repository.findOneBy({ email });
  }
  findByLoginOrEmail(loginOrEmail: string): Promise<User | null> {
    return this.repository.findOneBy([
      { login: loginOrEmail },
      { email: loginOrEmail },
    ]);
  }
  findByConfirmationCode(code: string): Promise<User | null> {
    if (!UUID_PATTERN.test(code)) return Promise.resolve(null);
    return this.repository.findOneBy({
      emailConfirmation: { confirmationCode: code },
    });
  }
  findByPasswordRecoveryCode(code: string): Promise<User | null> {
    if (!UUID_PATTERN.test(code)) return Promise.resolve(null);
    return this.repository.findOneBy({
      passwordRecovery: { recoveryCode: code },
    });
  }
}
