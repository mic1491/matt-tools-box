export const metadata = {
  title: 'Matt\\'s Tools Box',
  description: 'Personal toolkit and dashboard.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
