/** Знак «документ с галочкой»: справка готова. Не повторяет логотип МГИМО. */
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true">
      <rect width="36" height="36" rx="11" fill="#2563EB" />
      <path
        d="M12 8.5h8l5 5V25a2.5 2.5 0 0 1-2.5 2.5h-10.5A2.5 2.5 0 0 1 9.5 25V11A2.5 2.5 0 0 1 12 8.5Z"
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="m13.5 19 3 3 5.5-5.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="26.5" cy="9.5" r="3.5" fill="#FFB547" />
    </svg>
  );
}

export const CONCEPT_NOTE = "Концепт для конкурса MGIMO AI Challenge. Не официальный сервис МГИМО. Все данные вымышлены.";
