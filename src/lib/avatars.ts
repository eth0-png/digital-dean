// Набор аватарок вместо загрузки фото: никаких персональных данных и файлов (решение команды 8 ноября).
// В базе хранится только ключ из этого списка, всё остальное (значок и цвет) задаётся здесь.
// Цвета только из синей палитры, без градиентов.

export const AVATARS = {
  book: "Книга",
  globe: "Глобус",
  scale: "Весы",
  cap: "Шапочка",
  landmark: "Здание",
  feather: "Перо",
  languages: "Языки",
  compass: "Компас",
  star: "Звезда",
  coffee: "Кофе",
  music: "Музыка",
} as const;

export type AvatarKey = keyof typeof AVATARS;

export const isAvatarKey = (v: unknown): v is AvatarKey => typeof v === "string" && Object.hasOwn(AVATARS, v);
