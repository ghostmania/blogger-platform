import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { PaginatedViewDto } from 'src/core/dto/base.paginated.view-dto';
import { GetUsersQueryParams } from '../user-accounts/api/input-dto/get-users-query-params.input-dto';
import { UserViewDto } from '../user-accounts/api/view-dto/users.view-dto';
import { GetUsersQuery } from '../user-accounts/application/queries/get-users.query-handler';
import { ApiParam } from '@nestjs/swagger';
import { IdValidationPipe } from 'src/core/pipes/id-validation.pipe';
import { DeleteUserCommand } from '../user-accounts/application/usecases/delete-user.usecase';
import { CreateUserInputDto } from '../user-accounts/api/input-dto/users.input-dto';
import { GetUserByIdQuery } from '../user-accounts/application/queries/get-user-by-id.query-handler';
import { CreateConfirmedUserCommand } from '../user-accounts/application/usecases/create-confirmed-user.usecase';
import { BasicAuthGuard } from '../user-accounts/guards/basic/basic-auth.guard';
import { CreateBlogInputDto } from '../bloggers-platform/blogs/api/input-dto/create-blog.input-dto';
import { BlogViewDto } from '../bloggers-platform/blogs/api/view-dto/blogs.view-dto';
import { CreateBlogCommand } from '../bloggers-platform/blogs/application/usecases/create-blog.usecase';
import { GetBlogByIdQuery } from '../bloggers-platform/blogs/application/queries/get-blog-by-id.query-handler';

@Controller('sa')
export class SadminController {
  constructor(
    private queryBus: QueryBus,
    private commandBus: CommandBus,
  ) {}

  @Get('users')
  async getAll(
    @Query() query: GetUsersQueryParams,
  ): Promise<PaginatedViewDto<UserViewDto[]>> {
    return this.queryBus.execute(new GetUsersQuery(query));
  }

  @ApiParam({ name: 'id' }) //для сваггера
  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(BasicAuthGuard)
  async deleteUser(@Param('id', IdValidationPipe) id: string): Promise<void> {
    return this.commandBus.execute(new DeleteUserCommand(id));
  }

  @Post('users')
  // @HttpCode(HttpStatus.UNAUTHORIZED)
  @UseGuards(BasicAuthGuard)
  async createUser(@Body() body: CreateUserInputDto): Promise<UserViewDto> {
    //созданный админом юзер сразу считается подтверждённым
    const userId = await this.commandBus.execute<
      CreateConfirmedUserCommand,
      string
    >(new CreateConfirmedUserCommand(body));

    return this.queryBus.execute(new GetUserByIdQuery(userId));
  }

  // create blog as admin
  @Post('blogs')
  // @HttpCode(HttpStatus.UNAUTHORIZED)
  @UseGuards(BasicAuthGuard)
  async createBlog(@Body() body: CreateBlogInputDto): Promise<BlogViewDto> {
    const blogId = await this.commandBus.execute<
    CreateBlogCommand,
    string
    >(new CreateBlogCommand(body));
    return this.queryBus.execute(new GetBlogByIdQuery(blogId));
  }
}
