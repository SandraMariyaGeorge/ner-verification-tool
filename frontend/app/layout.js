import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Malayalam NER Verification Tool",
  description: "Sampling, entity bulk correction, and pattern error verification"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <h1 className="page-title">Malayalam NER Verification Tool</h1>
          <p className="page-subtitle">Sampling verification, entity bulk edits, and BIO pattern correction</p>
          <nav className="nav">
            <Link href="/">Dashboard</Link>
            <Link href="/sampling">Sampling</Link>
            <Link href="/entity">Entity Bulk Edit</Link>
            <Link href="/patterns">Pattern Detection</Link>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
