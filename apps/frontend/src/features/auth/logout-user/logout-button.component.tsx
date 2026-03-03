import { useUserMutations } from "#features/auth/auth.repository";

export function LogoutButton() {
  const { logout } = useUserMutations();

  return (
    <button
      onClick={() => logout.mutate()}
      disabled={logout.isPending}
      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {logout.isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
