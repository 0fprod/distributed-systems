import { LoginUserComponent } from "./login-user.component";

interface LoginUserFeatureProps {
  onLoggedIn: () => void;
}

export function LoginUserFeature({ onLoggedIn }: LoginUserFeatureProps) {
  return <LoginUserComponent onLoggedIn={onLoggedIn} />;
}
