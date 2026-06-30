import bcrypt from "bcrypt";
import User from "../models/User.model";

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

}

export const authService = new AuthService();