import { useAuthStore } from "../features/auth/state/auth.store";

export function ProtectedPlaceholderPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-text">
      <section className="mx-auto max-w-3xl rounded-panel border border-border bg-surface p-8 shadow-auth">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          Authenticated session
        </p>
        <h1 className="mt-3 text-2xl font-semibold">
          Client dashboard route is protected.
        </h1>
        <p className="mt-3 text-sm leading-6 text-subdued">
          This placeholder verifies login, session restoration, and protected
          routing without implementing a future dashboard screen.
        </p>
        {user ? (
          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-subdued">User ID</dt>
              <dd className="mt-1 font-semibold">{user.username}</dd>
            </div>
            <div>
              <dt className="font-medium text-subdued">Role</dt>
              <dd className="mt-1 font-semibold">{user.role}</dd>
            </div>
          </dl>
        ) : null}
      </section>
    </main>
  );
}
