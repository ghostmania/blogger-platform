import { Request } from 'express';

//user кладёт passport-стратегия; типизируем request, чтобы не тащить any
export type AuthenticatedRequest<TUser> = Request & { user?: TUser };
