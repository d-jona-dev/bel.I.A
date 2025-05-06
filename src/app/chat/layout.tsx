
// src/app/chat/layout.tsx
export default function ChatLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>; // The chat page itself will define its full structure including header.
}
