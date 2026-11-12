import Link from "next/link";
import type { ReactNode } from "react";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <main className="table">
      <aside className="table-brand">
        <Link href="/" className="brand">
          ♠ Poker Quest
        </Link>
        <div aria-hidden="true" className="cards">
          <span>
            Q<br />♠
          </span>
          <span>
            A<br />♥
          </span>
        </div>
      </aside>
      <section className="account-card">{children}</section>
    </main>
  );
}
