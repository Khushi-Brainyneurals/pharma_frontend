import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
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
import { LOGIN_USER_ROLE_OPTIONS, USER_ROLES, type UserRole } from "../model/roles";
import { useAuthStore } from "../state/auth.store";
import { Info } from 'lucide-react';

type LoginLocationState = {
  authNotice?: LoginFeedback;
};

type AuthTab = "admin" | "user";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LoginLocationState | null;
  const [feedback, setFeedback] = useState<LoginFeedback | null>(null);
  const visibleFeedback = feedback ?? locationState?.authNotice ?? null;
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setSession = useAuthStore((state) => state.setSession);
  const user = useAuthStore((state) => state.user);

  const [authTab, setAuthTab] = useState<AuthTab>("user");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      role: "",
    },
  });

  // Admin tab has no role picker — the role is fixed. Switching back to User
  // clears it so the existing "select your role" validation still applies.
  useEffect(() => {
    setValue("role", authTab === "admin" ? USER_ROLES.ADMIN : "", {
      shouldValidate: false,
    });
  }, [authTab, setValue]);

  if (isAuthenticated && user) {
    return <Navigate to={getPostLoginPath(user.role)} replace />;
  }

  async function onSubmit(values: LoginFormValues) {
    setFeedback(null);
    const role = authTab === "admin" ? USER_ROLES.ADMIN : (values.role as UserRole);

    try {
      const session = await login({
        username: values.username.trim(),
        password: values.password,
        role,
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

        <div
          className="relative mt-6 inline-flex w-full rounded-full bg-muted p-1"
          role="tablist"
          aria-label="Sign-in type"
        >
          <div
            className={`absolute top-1 bottom-1 rounded-full bg-accent-soft transition-all duration-300 ease-in-out ${
              authTab === "admin"
                ? "left-1 w-[calc(50%-4px)]"
                : "left-[calc(50%+2px)] w-[calc(50%-4px)]"
            }`}
          />

          <div className="relative z-10 flex w-full">
            <AuthTabButton
              id="admin"
              label="Admin"
              isActive={authTab === "admin"}
              isDisabled={isSubmitting}
              onSelect={setAuthTab}
            />
            <AuthTabButton
              id="user"
              label="User"
              isActive={authTab === "user"}
              isDisabled={isSubmitting}
              onSelect={setAuthTab}
            />
          </div>
        </div>

        <form
          id="auth-tab-panel"
          role="tabpanel"
          aria-labelledby={`auth-tab-${authTab}`}
          className="mt-6 space-y-5"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          {/* <AuthNotice message={visibleFeedback?.message} variant={visibleFeedback?.variant} /> */}

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

          {authTab === "user" ? (
            <Select
              id="role"
              label="Role"
              error={errors.role?.message}
              options={LOGIN_USER_ROLE_OPTIONS}
              placeholder="Select your role"
              disabled={isSubmitting}
              isRequired
              {...register("role")}
            />
          ) : null}

          <div className="space-y-4">
            <Button type="submit" isLoading={isSubmitting}>
              Sign in
            </Button>
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

function AuthTabButton({
  id,
  label,
  isActive,
  isDisabled,
  onSelect,
}: {
  id: AuthTab;
  label: string;
  isActive: boolean;
  isDisabled: boolean;
  onSelect: (id: AuthTab) => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`auth-tab-${id}`}
      aria-selected={isActive}
      aria-controls="auth-tab-panel"
      disabled={isDisabled}
      onClick={() => onSelect(id)}
      className={`relative z-10 flex min-h-10 flex-1 items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-70 ${
        isActive ? "text-primary border border-primary shadow-md bg-surface" : "text-subdued hover:text-text"
      }`}
    >
      {label}
    </button>
  );
}
