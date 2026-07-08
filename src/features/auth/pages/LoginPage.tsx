import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { getPostLoginPath } from "../../../app/routing/postLoginPath";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import { PasswordInput } from "../../../shared/ui/PasswordInput";
import { Select } from "../../../shared/ui/Select";
import { login } from "../api/auth.api";
import { getLoginFeedback, type LoginFeedback } from "../api/auth.errors";
import { AuthNotice } from "../components/AuthNotice";
import { AuthShell } from "../components/AuthShell";
import { loginSchema, type LoginFormValues } from "../model/login.schema";
import { USER_ROLE_OPTIONS, type UserRole } from "../model/roles";
import { useAuthStore } from "../state/auth.store";
import { Info } from 'lucide-react';

type LoginLocationState = {
  authNotice?: LoginFeedback;
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LoginLocationState | null;
  const [feedback, setFeedback] = useState<LoginFeedback | null>(null);
  const visibleFeedback = feedback ?? locationState?.authNotice ?? null;
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setSession = useAuthStore((state) => state.setSession);
  const user = useAuthStore((state) => state.user);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      role: "",
    },
  });

  if (isAuthenticated && user) {
    return <Navigate to={getPostLoginPath(user.role)} replace />;
  }

  async function onSubmit(values: LoginFormValues) {
    setFeedback(null);

    try {
      const session = await login({
        username: values.username.trim(),
        password: values.password,
        role: values.role as UserRole,
      });

      setSession(session);
      navigate(getPostLoginPath(session.user.role), { replace: true });
    } catch (error) {
      setFeedback(getLoginFeedback(error));
    }
  }

  return (
    <AuthShell>
      <section className="rounded-panel border border-border bg-surface px-8 py-8 shadow-auth">
        <header>
          <h1 className="text-2xl font-semibold text-text">Sign in</h1>
          <p className="mt-1 text-base leading-6 text-subdued">
            Use your assigned User ID and password.
          </p>
        </header>

        <form className="mt-7 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
          <AuthNotice message={visibleFeedback?.message} variant={visibleFeedback?.variant} />

              <Input
                id="username"
                label="User ID"
                autoComplete="username"
                placeholder="e.g. U-0427"
                error={errors.username?.message}
                disabled={isSubmitting}
                isRequired
                {...register("username")}
              />

              <PasswordInput
                id="password"
                label="Password"
                autoComplete="current-password"
                error={errors.password?.message}
                disabled={isSubmitting}
                isRequired
                {...register("password")}
              />

              <Select
                id="role"
                label="Role"
                error={errors.role?.message}
                options={USER_ROLE_OPTIONS}
                placeholder="Select your role"
                disabled={isSubmitting}
                isRequired
                {...register("role")}
              />

          <div className="space-y-4">
            <Button type="submit" isLoading={isSubmitting}>
              Sign in
            </Button>
            <a
              href="#"
              className="block text-center text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              Forgot password?
            </a>
          </div>
        </form>

        <p className="mt-6 flex items-start gap-2 rounded-control border border-border bg-muted px-3 py-3 text-sm leading-6 text-subdued">
          <Info className="mt-1 size-4 shrink-0" />
          <span>
            Password resets are handled by your site administrator. Contact your administrator.
          </span>
        </p>
      </section>
    </AuthShell>
  );
}
