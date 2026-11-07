export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <h1 className="text-2xl font-semibold">Цифровой деканат</h1>
      <p className="max-w-sm text-base">
        Кабинет в разработке. Скоро здесь можно будет посмотреть расписание и
        оценки, заказать справку и следить за её статусом.
      </p>
      <p className="max-w-sm rounded-xl border border-current/20 px-4 py-3 text-sm opacity-80">
        Концепт для конкурса MGIMO AI Challenge. Не официальный сервис МГИМО.
        Все данные вымышлены.
      </p>
    </main>
  );
}
