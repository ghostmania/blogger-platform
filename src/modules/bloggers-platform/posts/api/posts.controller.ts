import { GetPostsQueryParams } from './input-dto/get-posts-query-params.input-dto';
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtOptionalAuthGuard } from '../../../user-accounts/guards/bearer/jwt-optional-auth.guard';
import {
  ExtractUserIfExistsFromRequest
} from '../../../user-accounts/guards/decorators/param/extract-user-if-exists-from-request.decorator';
import { UserContextDto } from '../../../user-accounts/guards/dto/user-context.dto';
import { PaginatedViewDto } from '../../../../core/dto/base.paginated.view-dto';
import { PostViewDto } from './view-dto/posts.view-dto';
import { GetPostsQuery } from '../application/queries/get-posts.query-handler';
import { GetPostByIdQuery } from '../application/queries/get-post-by-id.query-handler';

@Controller('posts')
export class PostsController {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  //чтение публичное, но токен (если он есть) нужен для myStatus
  // @ApiBearerAuth()
  // @UseGuards(JwtOptionalAuthGuard)
  @Get()
  async getAll(
    @Query() query: GetPostsQueryParams,
    @ExtractUserIfExistsFromRequest() user: UserContextDto | null,
  ): Promise<PaginatedViewDto<PostViewDto[]>> {
    return this.queryBus.execute(new GetPostsQuery(query, user?.id ?? null));
  }

  // @ApiBearerAuth()
  // @UseGuards(JwtOptionalAuthGuard)
  @ApiParam({ name: 'id' })
  @Get(':id')
  async getById(
    @Param('id') id: string,
    @ExtractUserIfExistsFromRequest() user: UserContextDto | null,
  ): Promise<PostViewDto> {
    return this.queryBus.execute(new GetPostByIdQuery(id, user?.id ?? null));
  }

  // @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard)
  // @Put(':postId/like-status')
  // @HttpCode(HttpStatus.NO_CONTENT)
  // async updateLikeStatus(
  //   @Param('postId') postId: string,
  //   @Body() body: LikeStatusInputDto,
  //   @ExtractUserFromRequest() user: UserContextDto,
  // ): Promise<void> {
  //   return this.commandBus.execute(
  //     new UpdatePostLikeStatusCommand(postId, user.id, body.likeStatus),
  //   );
  // }
  //
  // @ApiBearerAuth()
  // @UseGuards(JwtOptionalAuthGuard)
  // @Get(':postId/comments')
  // async getComments(
  //   @Param('postId') postId: string,
  //   @Query() query: GetCommentsQueryParams,
  //   @ExtractUserIfExistsFromRequest() user: UserContextDto | null,
  // ): Promise<PaginatedViewDto<CommentViewDto[]>> {
  //   return this.queryBus.execute(
  //     new GetPostCommentsQuery(postId, query, user?.id ?? null),
  //   );
  // }
  //
  // @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard)
  // @Post(':postId/comments')
  // async createComment(
  //   @Param('postId') postId: string,
  //   @Body() body: CreateCommentInputDto,
  //   @ExtractUserFromRequest() user: UserContextDto,
  // ): Promise<CommentViewDto> {
  //   const commentId = await this.commandBus.execute<
  //     CreateCommentCommand,
  //     string
  //   >(new CreateCommentCommand(postId, user.id, body));
  //
  //   return this.queryBus.execute(new GetCommentByIdQuery(commentId, user.id));
  // }
  //
  // @ApiBasicAuth('basicAuth')
  // @UseGuards(BasicAuthGuard)
  // @Post()
  // async createPost(@Body() body: CreatePostInputDto): Promise<PostViewDto> {
  //   const postId = await this.commandBus.execute<CreatePostCommand, string>(
  //     new CreatePostCommand(body),
  //   );
  //
  //   return this.queryBus.execute(new GetPostByIdQuery(postId, null));
  // }
  //
  // @ApiBasicAuth('basicAuth')
  // @UseGuards(BasicAuthGuard)
  // @Put(':id')
  // @HttpCode(HttpStatus.NO_CONTENT)
  // async updatePost(
  //   @Param('id') id: string,
  //   @Body() body: UpdatePostInputDto,
  // ): Promise<void> {
  //   return this.commandBus.execute(new UpdatePostCommand(id, body));
  // }
  //
  // @ApiBasicAuth('basicAuth')
  // @UseGuards(BasicAuthGuard)
  // @Delete(':id')
  // @HttpCode(HttpStatus.NO_CONTENT)
  // async deletePost(@Param('id') id: string): Promise<void> {
  //   return this.commandBus.execute(new DeletePostCommand(id));
  // }
}
