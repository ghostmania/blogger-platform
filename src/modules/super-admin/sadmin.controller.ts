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
import { GetBlogsQueryParams } from '../bloggers-platform/blogs/api/input-dto/get-blogs-query-params.input-dto';
import { GetBlogsQuery } from '../bloggers-platform/blogs/application/queries/get-blogs.query-handler';
import { UpdateBlogInputDto } from '../bloggers-platform/blogs/api/input-dto/update-blog.input-dto';
import { UpdateBlogCommand } from '../bloggers-platform/blogs/application/usecases/update-blog.usecase';
import { DeleteBlogCommand } from '../bloggers-platform/blogs/application/usecases/delete-blog.usecase';
import { CreatePostForBlogInputDto } from '../bloggers-platform/posts/api/input-dto/create-post-for-blog.input-dto';
import { GetPostsQueryParams } from '../bloggers-platform/posts/api/input-dto/get-posts-query-params.input-dto';
import { UpdatePostInputDto } from '../bloggers-platform/posts/api/input-dto/update-post.input-dto';
import {
  AdminBlogPostsService,
  AdminPostView,
} from './admin-blog-posts.service';

@Controller('sa')
export class SadminController {
  constructor(
    private queryBus: QueryBus,
    private commandBus: CommandBus,
    private readonly adminBlogPostsService: AdminBlogPostsService,
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
  @UseGuards(BasicAuthGuard)
  async createBlog(@Body() body: CreateBlogInputDto): Promise<BlogViewDto> {
    const blogId = await this.commandBus.execute<CreateBlogCommand, string>(
      new CreateBlogCommand(body),
    );
    return this.queryBus.execute(new GetBlogByIdQuery(blogId));
  }

  @Get('blogs')
  @UseGuards(BasicAuthGuard)
  async getAllBlogs(
    @Query() query: GetBlogsQueryParams,
  ): Promise<PaginatedViewDto<BlogViewDto[]>> {
    return this.queryBus.execute(new GetBlogsQuery(query));
  }

  @ApiParam({ name: 'id' })
  @Put('blogs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(BasicAuthGuard)
  async updateBlog(
    @Param('id', IdValidationPipe) id: string,
    @Body() body: UpdateBlogInputDto,
  ): Promise<void> {
    return this.commandBus.execute(new UpdateBlogCommand(id, body));
  }

  @ApiParam({ name: 'id' })
  @Delete('blogs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(BasicAuthGuard)
  async deleteBlog(@Param('id', IdValidationPipe) id: string): Promise<void> {
    return this.commandBus.execute(new DeleteBlogCommand(id));
  }

  @Post('blogs/:blogId/posts')
  @UseGuards(BasicAuthGuard)
  async createBlogPost(
    @Param('blogId') blogId: string,
    @Body() body: CreatePostForBlogInputDto,
  ): Promise<AdminPostView> {
    return this.adminBlogPostsService.create(blogId, body);
  }

  @Get('blogs/:blogId/posts')
  @UseGuards(BasicAuthGuard)
  async getBlogPosts(
    @Param('blogId') blogId: string,
    @Query() query: GetPostsQueryParams,
  ): Promise<PaginatedViewDto<AdminPostView[]>> {
    return this.adminBlogPostsService.getAll(blogId, query);
  }

  @Put('blogs/:blogId/posts/:postId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(BasicAuthGuard)
  async updateBlogPost(
    @Param('blogId') blogId: string,
    @Param('postId') postId: string,
    @Body() body: UpdatePostInputDto,
  ): Promise<void> {
    return this.adminBlogPostsService.update(blogId, postId, body);
  }

  @Delete('blogs/:blogId/posts/:postId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(BasicAuthGuard)
  async deleteBlogPost(
    @Param('blogId') blogId: string,
    @Param('postId') postId: string,
  ): Promise<void> {
    return this.adminBlogPostsService.delete(blogId, postId);
  }
}
