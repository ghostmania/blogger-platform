//ограничения полей юзера по swagger-спеке — единый источник для схемы и DTO-валидации
export const loginConstraints = {
  minLength: 3,
  maxLength: 10,
  match: /^[a-zA-Z0-9_-]*$/,
};

export const passwordConstraints = {
  minLength: 6,
  maxLength: 20,
};

//паттерн из swagger-спеки: допускает плюс-адресацию (user+tag@domain.com),
//которой автотесты адресуют реальный ящик, и TLD длиннее 4 символов
export const emailConstraints = {
  match: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
};
