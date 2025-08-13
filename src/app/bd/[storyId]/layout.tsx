
// This layout can simply pass children through, as the main layout is handled by `src/app/bd/layout.tsx`
export default function StoryBdLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
