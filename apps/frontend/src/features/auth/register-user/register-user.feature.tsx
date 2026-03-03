import { ErrorBoundary } from "react-error-boundary";

import { RegisterUserComponent } from "./register-user.component";

interface RegisterUserFeatureProps {
  onRegistered: () => void;
}

function RegisterError() {
  return (
    <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
      Something went wrong. Please reload the page.
    </p>
  );
}

export function RegisterUserFeature({ onRegistered }: RegisterUserFeatureProps) {
  return (
    <ErrorBoundary FallbackComponent={RegisterError}>
      <RegisterUserComponent onSuccess={onRegistered} />
    </ErrorBoundary>
  );
}
