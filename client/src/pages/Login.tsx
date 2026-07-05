import AuthLayout from "../components/auth/AuthLayout";
import AuthCard from "../components/auth/AuthCard";
import LoginForm from "../components/auth/LoginForm";

export default function Login() {
  return (
    <AuthLayout>
      <AuthCard
        title="Welcome Back"
        subtitle="Sign in to continue to MuthuAI"
      >
        <LoginForm />
      </AuthCard>
    </AuthLayout>
  );
}