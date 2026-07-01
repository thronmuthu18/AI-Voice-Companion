import bcrypt from "bcrypt";
import User from "../models/User.model";
import { generateAccessToken } from "../utils/jwt";

export class AuthService {
  async register(name: string, email: string, password: string) {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    return user;
  }

  async login(email: string, password: string) {
    const user = await User.findOne({ email });

    if (!user) {
      throw new Error("Invalid email or password");
    }
    const isPasswordValid = await bcrypt.compare(
        password,
        user.password
      );

    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }

    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return {
      user,
      accessToken,
    };
  }
}

export const authService = new AuthService();