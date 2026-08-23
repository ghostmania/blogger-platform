import { CreateCommentInputDto } from './create-comment.input-dto';

//боди при обновлении комментария совпадает с созданием (content)
export class UpdateCommentInputDto extends CreateCommentInputDto {}
