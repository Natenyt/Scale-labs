export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background grid min-h-svh place-items-center p-6">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
