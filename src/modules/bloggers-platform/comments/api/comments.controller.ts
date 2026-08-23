import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CommentViewDto } from './view-dto/comments.view-dto';
import { UpdateCommentInputDto } from './input-dto/update-comment.input-dto';
import { LikeStatusInputDto } from '../../dto/like-status.input-dto';
import { UpdateCommentCommand } from '../application/usecases/update-comment.usecase';
import { DeleteCommentCommand } from '../application/usecases/delete-comment.usecase';
import { UpdateCommentLikeStatusCommand } from '../application/usecases/update-comment-like-status.usecase';
import { GetCommentByIdQuery } from '../application/queries/get-comment-by-id.query-handler';
import { JwtAuthGuard } from '../../../user-accounts/guards/bearer/jwt-auth.guard';
import { JwtOptionalAuthGuard } from '../../../user-accounts/guards/bearer/jwt-optional-auth.guard';
import { ExtractUserFromRequest } from '../../../user-accounts/guards/decorators/param/extract-user-from-request.decorator';
import { ExtractUserIfExistsFromRequest } from '../../../user-accounts/guards/decorators/param/extract-user-if-exists-from-request.decorator';
import { UserContextDto } from '../../../user-accounts/guards/dto/user-context.dto';

@Controller('comments')
export class CommentsController {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put(':commentId/like-status')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateLikeStatus(
    @Param('commentId') commentId: string,
    @Body() body: LikeStatusInputDto,
    @ExtractUserFromRequest() user: UserContextDto,
  ): Promise<void> {
    return this.commandBus.execute(
      new UpdateCommentLikeStatusCommand(commentId, user.id, body.likeStatus),
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put(':commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateComment(
    @Param('commentId') commentId: string,
    @Body() body: UpdateCommentInputDto,
    @ExtractUserFromRequest() user: UserContextDto,
  ): Promise<void> {
    return this.commandBus.execute(
      new UpdateCommentCommand(commentId, user.id, body),
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteComment(
    @Param('commentId') commentId: string,
    @ExtractUserFromRequest() user: UserContextDto,
  ): Promise<void> {
    return this.commandBus.execute(
      new DeleteCommentCommand(commentId, user.id),
    );
  }

  //чтение публичное, но токен (если он есть) нужен для myStatus
  @ApiBearerAuth()
  @UseGuards(JwtOptionalAuthGuard)
  @ApiParam({ name: 'id' })
  @Get(':id')
  async getById(
    @Param('id') id: string,
    @ExtractUserIfExistsFromRequest() user: UserContextDto | null,
  ): Promise<CommentViewDto> {
    return this.queryBus.execute(new GetCommentByIdQuery(id, user?.id ?? null));
  }
}
