import { NextResponse, type NextRequest } from "next/server";

// Быстрая проверка без базы: нет cookie сессии, значит, на вход.
// Настоящая проверка сессии и роли в src/lib/auth.ts на каждой странице и в каждом действии.
export function proxy(req: NextRequest) {
  if (req.nextUrl.pathname === "/login" || req.cookies.has("session")) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg|favicon.ico).*)"],
};
