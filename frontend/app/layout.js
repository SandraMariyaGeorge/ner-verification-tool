import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Multi-user NER Verification Platform",
  description: "Project-based sampling, entity bulk correction, and BIO pattern verification"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <h1 className="page-title">Malayalam NER Verification Tool</h1>
          <p className="page-subtitle">Multi-user, project-based sampling verification and correction workspace</p>
          <nav className="nav">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/login">Login</Link>
            <Link href="/signup">Signup</Link>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
