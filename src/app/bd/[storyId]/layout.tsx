
// src/app/bd/[storyId]/layout.tsx
// This layout passes children through, as the page itself handles its full structure.
export default function StoryComicEditorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
