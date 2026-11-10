import { Transform, TransformFnParams } from 'class-transformer';

//обрезает пробелы по краям строки до валидации, чтобы " abc " не проходил как валидное значение
export const Trim = () =>
  Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim() : (value as unknown),
  );
