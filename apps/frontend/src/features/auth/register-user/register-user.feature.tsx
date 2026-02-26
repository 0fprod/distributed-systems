import { RegisterUserComponent } from "./register-user.component";

interface RegisterUserFeatureProps {
  onRegistered: () => void;
}

export function RegisterUserFeature({ onRegistered }: RegisterUserFeatureProps) {
  return <RegisterUserComponent onSuccess={onRegistered} />;
}
