import { Argon2idJsHasher } from './password-argon2id-js';
import { isBunRuntime, passwordHasher } from './password-hasher';
import { hashPassword, verifyPassword } from './password';

const hash = await hashPassword('SecurePassword123!');
const argon2Verified = await verifyPassword(
  'KnownTestPassword1!',
  '$argon2id$v=19$m=65536,t=2,p=1$9Rpb7Vy0/fQOsRiXXYpDm73xYTNAAU84oTHhVpIRgGg$gufu68Vx6EqJbpyflezrsARjjGsM4uoVzkaCCEvKpsw'
);
const roundTripVerified = await verifyPassword('SecurePassword123!', hash);

process.stdout.write(
  JSON.stringify({
    isBunRuntime,
    isJs: passwordHasher instanceof Argon2idJsHasher,
    hashStartsWithArgon2id: hash.startsWith('$argon2id$'),
    argon2Verified,
    roundTripVerified,
  })
);
