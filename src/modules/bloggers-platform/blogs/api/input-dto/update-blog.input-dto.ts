import { CreateBlogInputDto } from './create-blog.input-dto';

//боди при обновлении блога совпадает с созданием (name, description, websiteUrl)
export class UpdateBlogInputDto extends CreateBlogInputDto {}
