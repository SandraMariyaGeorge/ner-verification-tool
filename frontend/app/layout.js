import "./globals.css";

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
          {children}
        </div>
      </body>
    </html>
  );
}
