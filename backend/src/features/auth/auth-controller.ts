
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

}

export default new AuthController();