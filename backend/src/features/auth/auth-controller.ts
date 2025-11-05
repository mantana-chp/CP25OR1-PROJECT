
import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/asyncHandler';
import AuthService from './auth-service';
import { sendSuccess } from '../../shared/response';

class AuthController {
  deviceLogin = asyncHandler(async (req: Request, res: Response) => {
    const { installationId, platform, platformDeviceId, platformIdSource } = req.body;
    const { user, accessToken, refreshToken } = await AuthService.deviceLogin(
      installationId,
      platform,
      platformDeviceId,
      platformIdSource
    );
    sendSuccess(res, { user, accessToken, refreshToken }, 200);
  });

  refresh = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const xInstallationId = req.headers['x-installation-id'] as string;
    const { user, accessToken, refreshToken: newRefreshToken } = await AuthService.refresh(refreshToken, xInstallationId);
    sendSuccess(res, { user, accessToken, refreshToken: newRefreshToken }, 200);
  });

  // logout = asyncHandler(async (req: Request, res: Response) => {
  //   const { refreshToken } = req.body;
  //   await AuthService.logout(refreshToken);
  //   sendSuccess(res, { message: 'User logged out successfully' }, 200);
  // });

}

export default new AuthController();


// For device transfer in other release
// rebind = asyncHandler(async (req: Request, res: Response) => {
//   const { newInstallationId, newPlatform, newPlatformDeviceId, newPlatformIdSource } = req.body;
//   const userId = req.user?.id as string; // Assuming userId is available from authGuard
//   const { user, accessToken, refreshToken } = await AuthService.rebind(
//     userId,
//     newInstallationId,
//     newPlatform,
//     newPlatformDeviceId,
//     newPlatformIdSource
//   );
//   const response = new AppResponse({
//     data: { user, accessToken, refreshToken },
//     message: 'Device rebind successful',
//   });
//   res.status(200).json(response);
// });