/**
 * Bot check — legacy used Google reCAPTCHA v2: verified server-side on the
 * contact form but client-only on registration (bypassable). Server-side
 * verification is mandatory everywhere it is used.
 */
export interface CaptchaVerifier {
  /** True only when Google's siteverify accepts the token. */
  verify(token: string, remoteIp?: string): Promise<boolean>;
}
