import { CreatePostInputDto } from './create-post.input-dto';

//боди при обновлении поста совпадает с созданием (title, shortDescription, content, blogId)
export class UpdatePostInputDto extends CreatePostInputDto {}
