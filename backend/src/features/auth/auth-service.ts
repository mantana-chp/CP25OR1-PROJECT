import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../libs/db';
import { config } from '../../config';
import { platform, platform_id_source } from '../../generated/prisma/client';
import { NotFoundError, UnauthorizedError } from '../../shared/errors';

interface AccessTokenPayload {
  userId: string;
  installationId: string;
}

interface RefreshTokenPayload {
  userId: string;
  jti: string;
}

class AuthService {
  async deviceLogin(installationId: string, platform: platform, platformDeviceId: string, platformIdSource: platform_id_source) {
    let user = await prisma.users.findFirst({ where: { current_platform_device_id: platformDeviceId } });

    if (!user) {
      user = await prisma.users.create({
        data: {
          id: uuidv4(),
          current_installation_id: installationId,
          current_platform: platform,
          current_platform_device_id: platformDeviceId,
          current_platform_id_source: platformIdSource,
          created_at: new Date(),
        },
      });
    } else if (user.current_installation_id !== installationId) { // rebind
      user = await prisma.users.update({
        where: { id: user.id },
        data: { current_installation_id: installationId, updated_at: new Date() },
      });
    }

    await prisma.sessions.deleteMany({ where: { user_id: user.id } });

    const { accessToken, refreshToken } = await this.generateAndSaveTokens(user.id, installationId);

    return { user, accessToken, refreshToken };
  }

  async refresh(refreshToken: string, xInstallationId: string) {
    let decoded: RefreshTokenPayload;
    try {
      decoded = jwt.verify(refreshToken, config.refreshToken.secret) as RefreshTokenPayload;
    } catch (err) {
      throw new UnauthorizedError('Refresh token is expired or has an invalid signature.');
    }

    const oldSession = await prisma.sessions.findUnique({
      where: { jti: decoded.jti },
    });

    if (!oldSession) {
      throw new UnauthorizedError('Refresh token not found in database. It may have been invalidated by a newer login.');
    }

    if (oldSession.replaced_by) {
      throw new UnauthorizedError('Refresh token has already been used. Potential security risk.');
    }

    if (new Date() > oldSession.expires_at) {
      throw new UnauthorizedError('Refresh token has expired.');
    }

    const user = await prisma.users.findUnique({ where: { id: decoded.userId } });
    if (!user || user.current_installation_id !== xInstallationId) {
      throw new UnauthorizedError('Installation ID does not match.');
    }

    const { accessToken, refreshToken: newRefreshToken, newSessionId } = await this.generateAndSaveTokens(user.id, user.current_installation_id);

    await prisma.sessions.update({
      where: { id: oldSession.id },
      data: { replaced_by: newSessionId },
    });

    return { user, accessToken, refreshToken: newRefreshToken };
  }

  // async logout(refreshToken: string) {
  //   try {
  //     const decoded = jwt.verify(refreshToken, config.refreshToken.secret) as RefreshTokenPayload;
  //     await prisma.sessions.delete({ where: { jti: decoded.jti } });
  //   } catch (error) {
  //   
  //   }
  // }

  private async generateAndSaveTokens(userId: string, installationId: string) {
    const accessToken = this.generateAccessToken(userId, installationId);
    const { token: refreshToken, jti } = this.generateRefreshToken(userId);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const newSession = await prisma.sessions.create({
      data: {
        id: uuidv4(),
        user_id: userId,
        jti: jti,
        device_installation_id: installationId,
        expires_at: expiresAt,
      },
    });

    return { accessToken, refreshToken, newSessionId: newSession.id };
  }

  private generateAccessToken(userId: string, installationId: string): string {
    const options: SignOptions = {
      expiresIn: config.jwt.expiresIn as any,
    };
    const payload: AccessTokenPayload = { userId, installationId };
    return jwt.sign(payload, config.jwt.secret as Secret, options);
  }

  private generateRefreshToken(userId: string): { token: string; jti: string } {
    const jti = uuidv4();
    const options: SignOptions = {
      expiresIn: config.refreshToken.expiresIn as any,
      jwtid: jti,
    };
    const payload = { userId };
    const token = jwt.sign(payload, config.refreshToken.secret as Secret, options);
    return { token, jti };
  }
}

export default new AuthService();
