import { LikeStatus } from '../enums/like-status.enum';

export type LikesDelta = {
  likesDelta: number;
  dislikesDelta: number;
};

/**
 * Насколько изменятся денормализованные счётчики при переходе реакции
 * одного пользователя из oldStatus в newStatus.
 * Общая для постов и комментариев — правила подсчёта у них одинаковые.
 */
export function calculateLikesDelta(
  oldStatus: LikeStatus,
  newStatus: LikeStatus,
): LikesDelta {
  if (oldStatus === newStatus) {
    return { likesDelta: 0, dislikesDelta: 0 };
  }

  const countFor = (status: LikeStatus) => ({
    likes: status === LikeStatus.Like ? 1 : 0,
    dislikes: status === LikeStatus.Dislike ? 1 : 0,
  });

  const before = countFor(oldStatus);
  const after = countFor(newStatus);

  return {
    likesDelta: after.likes - before.likes,
    dislikesDelta: after.dislikes - before.dislikes,
  };
}
