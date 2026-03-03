import { ErrorBoundary } from "react-error-boundary";

import { LoginUserComponent } from "./login-user.component";

interface LoginUserFeatureProps {
  onLoggedIn: () => void;
}

function LoginError() {
  return (
    <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
      Something went wrong. Please reload the page.
    </p>
  );
}

export function LoginUserFeature({ onLoggedIn }: LoginUserFeatureProps) {
  return (
    <ErrorBoundary FallbackComponent={LoginError}>
      <LoginUserComponent onLoggedIn={onLoggedIn} />
    </ErrorBoundary>
  );
}
