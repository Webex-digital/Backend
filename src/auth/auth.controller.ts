import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { LoginDto, RegisterDto } from './dto/auth.dto';

type GoogleCallbackRequest = Request & {
  user: {
    googleId: string;
    email: string;
    fullName: string;
  };
};

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Guard handles the redirection to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: GoogleCallbackRequest, @Res() res: Response) {
    const result = await this.authService.validateGoogleUser(req.user);

    // In a real app, you'd redirect to frontend with the token.
    // For now, we return the JSON response for verification.
    res.json(result);
  }
}
