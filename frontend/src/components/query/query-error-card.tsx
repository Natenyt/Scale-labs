export function QueryErrorCard({ message }: { message: string }) {
  return (
    <div className="border-destructive/40 bg-destructive/5 text-destructive rounded-lg border px-4 py-3 text-sm">
      {message}
    </div>
  );
}
