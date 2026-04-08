import { passwordHasher, isBunRuntime } from './password-hasher';
import { Pbkdf2Hasher } from './password-pbkdf2';
import { hashPassword, verifyPassword } from './password';

const warnings: string[] = [];
const originalWarn = console.warn;

console.warn = (message?: unknown, ...args: unknown[]) => {
  warnings.push([message, ...args].map(String).join(' '));
};

try {
  const hash = await hashPassword('SecurePassword123!');
  const argon2Verified = await verifyPassword(
    'TestPassword123!',
    '$argon2id$v=19$m=65536,t=2,p=1$KKa335shvrWayGnd1ZwIFoLuZwFVnVFx4UMio6TCIbo$vK8PnpIuF1zweSNXM4H5VfPQURPkSpiDVa1BhbS6GFE'
  );

  process.stdout.write(
    JSON.stringify({
      isBunRuntime,
      isPbkdf2: passwordHasher instanceof Pbkdf2Hasher,
      hashStartsWithPbkdf2: hash.startsWith('$pbkdf2-sha256$'),
      argon2Verified,
      warningSeen: warnings.some((message) =>
        message.includes('Argon2id hash encountered on non-Bun runtime; cannot verify')
      ),
    })
  );
} finally {
  console.warn = originalWarn;
}
