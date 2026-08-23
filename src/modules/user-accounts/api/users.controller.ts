import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Types } from 'mongoose';
import { ApiBasicAuth, ApiParam } from '@nestjs/swagger';
import { UserViewDto } from './view-dto/users.view-dto';
import { CreateUserInputDto } from './input-dto/users.input-dto';
import { UpdateUserInputDto } from './input-dto/update-user.input-dto';
import { GetUsersQueryParams } from './input-dto/get-users-query-params.input-dto';
import { PaginatedViewDto } from '../../../core/dto/base.paginated.view-dto';
import { BasicAuthGuard } from '../guards/basic/basic-auth.guard';
import { ObjectIdValidationPipe } from '../../../core/pipes/object-id-validation-transformation-pipe.service';
import { CreateConfirmedUserCommand } from '../application/usecases/create-confirmed-user.usecase';
import { UpdateUserCommand } from '../application/usecases/update-user.usecase';
import { DeleteUserCommand } from '../application/usecases/delete-user.usecase';
import { GetUsersQuery } from '../application/queries/get-users.query-handler';
import { GetUserByIdQuery } from '../application/queries/get-user-by-id.query-handler';

@Controller('users')
@UseGuards(BasicAuthGuard) //CRUD юзеров доступен только суперадмину (basic auth)
@ApiBasicAuth('basicAuth')
export class UsersController {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @ApiParam({ name: 'id' }) //для сваггера
  @Get(':id')
  async getById(
    @Param('id', ObjectIdValidationPipe) id: string,
  ): Promise<UserViewDto> {
    return this.queryBus.execute(new GetUserByIdQuery(id));
  }

  @Get()
  async getAll(
    @Query() query: GetUsersQueryParams,
  ): Promise<PaginatedViewDto<UserViewDto[]>> {
    return this.queryBus.execute(new GetUsersQuery(query));
  }

  @Post()
  async createUser(@Body() body: CreateUserInputDto): Promise<UserViewDto> {
    //созданный админом юзер сразу считается подтверждённым
    const userId = await this.commandBus.execute<
      CreateConfirmedUserCommand,
      Types.ObjectId
    >(new CreateConfirmedUserCommand(body));

    return this.queryBus.execute(new GetUserByIdQuery(userId.toString()));
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Put(':id')
  async updateUser(
    //глобальный ObjectIdValidationTransformationPipe превратит строку в Types.ObjectId
    @Param('id') id: Types.ObjectId,
    @Body() body: UpdateUserInputDto,
  ): Promise<UserViewDto> {
    const userId = await this.commandBus.execute<UpdateUserCommand, string>(
      new UpdateUserCommand(id, body),
    );

    return this.queryBus.execute(new GetUserByIdQuery(userId));
  }

  @ApiParam({ name: 'id' }) //для сваггера
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(
    @Param('id', ObjectIdValidationPipe) id: string,
  ): Promise<void> {
    return this.commandBus.execute(new DeleteUserCommand(id));
  }
}
