import { RegisterUserFeature } from "#features/auth/register-user";

interface RegisterPageProps {
  onRegistered: () => void;
}

export function RegisterPage({ onRegistered }: RegisterPageProps) {
  return <RegisterUserFeature onRegistered={onRegistered} />;
}
