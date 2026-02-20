"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useAppSelector,
  useAppDispatch,
  selectIsLoggedIn,
  selectUser,
  selectIsLoading,
  selectSessionChecked,
  validateSession,
} from "@/lib/store";

interface UseUserOptions {
  redirectTo?: string;
  redirectIfFound?: boolean;
}

export function useUser(options: UseUserOptions = {}) {
  const { redirectTo, redirectIfFound = false } = options;
  const router = useRouter();
  const dispatch = useAppDispatch();

  const isLoggedIn = useAppSelector(selectIsLoggedIn);
  const user = useAppSelector(selectUser);
  const isLoading = useAppSelector(selectIsLoading);
  const sessionChecked = useAppSelector(selectSessionChecked);

  useEffect(() => {
    // Validate session on mount
    dispatch(validateSession());
  }, [dispatch]);

  useEffect(() => {
    // Don't redirect until session is checked
    if (!sessionChecked) return;

    if (redirectTo) {
      if (
        // Redirect to login if not logged in
        (!redirectIfFound && !isLoggedIn) ||
        // Redirect to home if logged in (for login/signup pages)
        (redirectIfFound && isLoggedIn)
      ) {
        router.push(redirectTo);
      }
    }
  }, [isLoggedIn, sessionChecked, redirectTo, redirectIfFound, router]);

  return {
    user,
    isLoggedIn,
    isLoading: isLoading || !sessionChecked,
    sessionChecked,
    sessionToken: user?.session_token || null,
  };
}

export default useUser;
