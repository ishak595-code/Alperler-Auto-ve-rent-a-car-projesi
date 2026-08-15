import { ErrorHandler, Injectable, inject } from "@angular/core";
import { SystemHealthService } from "./system-health.service";

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly health = inject(SystemHealthService);

  handleError(value: unknown): void {
    const error = this.unwrap(value);
    // Keep native console diagnostics for developers while sending only
    // sanitized metadata through SystemHealthService.
    console.error(error);
    void this.health.handleUnexpected(error, "angular");
  }

  private unwrap(value: unknown): Error {
    if (value instanceof Error) return value;
    if (value && typeof value === "object") {
      const candidate = value as { rejection?: unknown; ngOriginalError?: unknown; message?: unknown };
      if (candidate.ngOriginalError instanceof Error) return candidate.ngOriginalError;
      if (candidate.rejection instanceof Error) return candidate.rejection;
      if (typeof candidate.message === "string") return new Error(candidate.message);
    }
    if (typeof value === "string") return new Error(value);
    return new Error("Unknown Angular runtime error");
  }
}
