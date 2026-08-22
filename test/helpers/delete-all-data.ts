import { INestApplication } from '@nestjs/common';
import request from 'supertest';

//без глобального префикса: роуты в корне
export const deleteAllData = async (app: INestApplication) => {
  return request(app.getHttpServer()).delete(`/testing/all-data`);
};
