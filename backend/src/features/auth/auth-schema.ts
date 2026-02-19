
import { z } from 'zod';

export const deviceLoginSchema = z.object({
  body: z.object({
    installationId: z.uuid('Invalid installation ID'),
    platform: z.enum(['ios', 'android', 'other']),
    platformDeviceId: z.uuid('Invalid platform device ID'),
    platformIdSource: z.enum(['ios_keychain', 'android_ssaid', 'unknown']),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string(),
  }),
  headers: z.object({
    'x-installation-id': z.string(),
  }).loose(),
});

// export const logoutSchema = z.object({
//   body: z.object({
//     refreshToken: z.string(),
//   }),
// });

// For device transfer in other release
// export const rebindSchema = z.object({
//   body: z.object({
//     newInstallationId: z.string(),
//     newPlatform: z.enum(['ios', 'android', 'other']),
//     newPlatformDeviceId: z.string(),
//     newPlatformIdSource: z.enum(['ios_keychain', 'android_ssaid', 'unknown']),
//   }),
// });
