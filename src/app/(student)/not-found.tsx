import { NotFoundView } from "@/components/kit";

// Чужая или несуществующая заявка, справка: внутри кабинета, шапка остаётся.
// Для сотрудника отдельного not-found нет: студент на /staff должен видеть общий экран, без шапки кабинета сотрудника.
export default function StudentNotFound() {
  return <NotFoundView />;
}
