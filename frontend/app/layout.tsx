import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '../components/layout/AppShell';

export const metadata: Metadata = {
  title: 'Customer Feedback Intelligence | AI-Powered Feedback Analysis',
  description: 'Enterprise feedback analytics platform powered by Google Gemini. Classify sentiment, identify recurring pain points, cluster thematic topics, and export formatted reports.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="h-full bg-[#0B0F17] text-slate-100 overflow-hidden">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
