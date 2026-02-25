import { RegisterComponent } from "#features/auth/register/register.component";

interface RegisterPageProps {
  onRegistered: () => void;
}

export function RegisterPage({ onRegistered }: RegisterPageProps) {
  return <RegisterComponent onSuccess={onRegistered} />;
}
