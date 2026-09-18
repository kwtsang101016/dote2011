export class AuthNeedsPinSetupError extends Error {
  readonly needsPinSetup = true as const;

  constructor(message?: string) {
    super(message ?? "PIN setup required.");
    this.name = "AuthNeedsPinSetupError";
  }
}

export function isAuthNeedsPinSetupError(error: unknown): error is AuthNeedsPinSetupError {
  return error instanceof AuthNeedsPinSetupError;
}
