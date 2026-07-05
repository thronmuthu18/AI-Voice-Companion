import AuthLayout from "../components/auth/AuthLayout";
import AuthCard from "../components/auth/AuthCard";
import RegisterForm from "../components/auth/RegisterForm";

export default function Register() {
  return (
    <AuthLayout>
      <AuthCard
        title="Create Account"
        subtitle="Get started with MuthuAI OS today"
      >
        <RegisterForm />
      </AuthCard>
    </AuthLayout>
  );
}