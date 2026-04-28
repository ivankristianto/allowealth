import { isBunRuntime, passwordHasher } from './password-hasher';
import { Pbkdf2Hasher } from './password-pbkdf2';
import { hashPassword, verifyPassword } from './password';

const warnings: string[] = [];
const originalWarn = console.warn;

console.warn = (message?: unknown, ...args: unknown[]) => {
  warnings.push([message, ...args].map(String).join(' '));
};

try {
  const hash = await hashPassword('SecurePassword123!');
  const argon2VerifyResult = await verifyPassword(
    'KnownTestPassword1!',
    '$argon2id$v=19$m=65536,t=2,p=1$9Rpb7Vy0/fQOsRiXXYpDm73xYTNAAU84oTHhVpIRgGg$gufu68Vx6EqJbpyflezrsARjjGsM4uoVzkaCCEvKpsw'
  );
  const roundTripVerified = await verifyPassword('SecurePassword123!', hash);

  process.stdout.write(
    JSON.stringify({
      isBunRuntime,
      isPbkdf2: passwordHasher instanceof Pbkdf2Hasher,
      hashStartsWithPbkdf2: hash.startsWith('$pbkdf2-sha256$'),
      argon2VerifyResult,
      roundTripVerified,
      argon2WarningSeen: warnings.some((message) =>
        message.includes('Argon2id hash encountered on non-Bun runtime')
      ),
    })
  );
} finally {
  console.warn = originalWarn;
}
