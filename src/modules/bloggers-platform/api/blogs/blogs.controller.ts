import { Controller, Get, Query } from '@nestjs/common';
import { PaginatedViewDto } from 'src/core/dto/base.paginated.view-dto';
import { GetBlogsQueryParams } from './input-dto/get-blogs-query-params.input-dto';
import { BlogViewDto } from './view-dto/blogs.view-dto';
import { BlogsQueryRepository } from '../../infrastructure/query/blogs/blogs.query-repository';

@Controller('blogs')
export class BlogsController {
    constructor(
        private blogsQueryRepository: BlogsQueryRepository
    ){
        console.log('Blogs controller created')
    }

    @Get()
    async getAll(
        @Query() query: GetBlogsQueryParams,
    ): Promise<PaginatedViewDto<BlogViewDto[]>> {
        return this.blogsQueryRepository.getAll(query);
    }
}
