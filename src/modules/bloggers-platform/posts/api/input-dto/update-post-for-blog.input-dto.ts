import { CreatePostForBlogInputDto } from './create-post-for-blog.input-dto';

// blogId is already part of the route for PUT /sa/blogs/:blogId/posts/:postId.
export class UpdatePostForBlogInputDto extends CreatePostForBlogInputDto {}
