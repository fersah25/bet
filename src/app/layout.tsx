import './globals.css';
import { Providers } from './providers';
import { headers } from 'next/headers' // added

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const cookies = headersList.get('cookie') // added

  return (
    <html lang="en">
      <body>
        <Providers cookies={cookies}>{children}</Providers>
      </body>
    </html>
  );
}