export function asFormAction(fn: object): (formData: FormData) => Promise<void> {
  return fn as (formData: FormData) => Promise<void>;
}
