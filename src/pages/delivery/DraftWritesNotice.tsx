export function DraftWritesNotice({ children }: { children: string }) {
  return (
    <p data-testid="draft-writes-unavailable" className="text-sm text-muted-foreground">
      {children}
    </p>
  );
}
